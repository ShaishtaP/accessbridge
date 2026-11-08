// Checks the fix-verification workflow end to end: fixed -> retest -> reopened or verified,
// with the original timeline kept on the issue. Uses the real database and the demo site.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import Page from '../src/models/Page.js';
import AuditJob from '../src/models/AuditJob.js';
import Issue from '../src/models/Issue.js';
import ActivityEvent from '../src/models/ActivityEvent.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
delete process.env.AUDIT_ALLOWLIST;

const stamp = Date.now();
const emails = [`rt-owner-${stamp}@example.test`, `rt-outsider-${stamp}@example.test`];
const password = 'smoke-pass-123';
const workerEntry = fileURLToPath(new URL('../../worker/src/index.js', import.meta.url));
let failed = false;

function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed = true;
}

// The worker really opens the page, so the demo site must be running.
const demo = spawn(process.execPath, [fileURLToPath(new URL('../../demo-site/server.js', import.meta.url))]);
await new Promise((resolve) => demo.stdout.once('data', resolve));

await connectDB(process.env.MONGODB_URI);
const server = createApp().listen(0);
const base = `http://localhost:${server.address().port}/api`;

async function call(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body && JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

try {
  const owner = (await call('POST', '/auth/register', null, { name: 'RT Owner', email: emails[0], password })).body;
  const outsider = (await call('POST', '/auth/register', null, { name: 'RT Out', email: emails[1], password })).body;

  const ws = (await call('POST', '/workspaces', owner.token, { name: 'Retest smoke' })).body.workspace;
  const page = (await call('POST', `/workspaces/${ws.id}/pages`, owner.token, { url: 'http://localhost:4000/menu.html' })).body.page;
  const issues = `/workspaces/${ws.id}/issues`;
  const runWorker = () => execFileSync(process.execPath, [workerEntry, '--once'], { stdio: 'ignore', timeout: 120000 });

  // First audit: creates real issues from the demo page's seeded defects.
  await call('POST', `/workspaces/${ws.id}/audits`, owner.token, { pageId: page.id });
  runWorker();
  const found = (await call('GET', `${issues}?pageId=${page.id}`, owner.token)).body.issues;
  const real = found.find((i) => i.ruleId && i.selector);
  check('audit produced an automated issue to retest', Boolean(real));

  check('retest of an open issue returns 409', (await call('POST', `${issues}/${real.id}/retest`, owner.token)).status === 409);
  check('status "verified" cannot be set by hand',
    (await call('PATCH', `${issues}/${real.id}`, owner.token, { status: 'verified' })).status === 400);

  // Still broken on the page: the retest must reopen it.
  await call('PATCH', `${issues}/${real.id}`, owner.token, { status: 'fixed' });
  check('non-member retest returns 404', (await call('POST', `${issues}/${real.id}/retest`, outsider.token)).status === 404);
  const retest = await call('POST', `${issues}/${real.id}/retest`, owner.token);
  check('retest of a fixed issue is queued (201)', retest.status === 201 && retest.body.job?.retestIssueId === real.id);
  check('second retest while one is pending returns 409', (await call('POST', `${issues}/${real.id}/retest`, owner.token)).status === 409);
  runWorker();
  const job = (await call('GET', `/workspaces/${ws.id}/audits/${retest.body.job.id}`, owner.token)).body.job;
  check('retest job finishes with outcome "reopened"', job?.status === 'done' && job.result?.retest?.outcome === 'reopened');
  check('issue is reopened', (await call('GET', `${issues}/${real.id}`, owner.token)).body.issue?.status === 'reopened');
  const timeline = (await call('GET', `${issues}/${real.id}/activity`, owner.token)).body;
  const actions = JSON.stringify(timeline);
  check('timeline keeps the original creation and records the retest',
    actions.includes('issue.created') && actions.includes('issue.retest_requested') && actions.includes('issue.retested'));
  check('reopened issue was not duplicated by the retest scan',
    (await call('GET', `${issues}?pageId=${page.id}`, owner.token)).body.issues.length === found.length);

  // A finding whose element no longer fails is verified.
  const gone = (await call('POST', issues, owner.token, {
    pageId: page.id, title: 'Image without alt text', severity: 'critical', wcag: '1.1.1',
    ruleId: 'image-alt', selector: '#element-removed-in-fix',
  })).body.issue;
  await call('PATCH', `${issues}/${gone.id}`, owner.token, { status: 'fixed' });
  check('retest of the fixed finding is queued', (await call('POST', `${issues}/${gone.id}/retest`, owner.token)).status === 201);
  runWorker();
  check('issue that no longer fails is verified', (await call('GET', `${issues}/${gone.id}`, owner.token)).body.issue?.status === 'verified');

  // Manual issues without a rule id cannot be judged automatically.
  const manual = (await call('POST', issues, owner.token, { pageId: page.id, title: 'Focus order', severity: 'moderate', wcag: '2.4.3' })).body.issue;
  await call('PATCH', `${issues}/${manual.id}`, owner.token, { status: 'fixed' });
  check('retest of a manual issue returns 400', (await call('POST', `${issues}/${manual.id}/retest`, owner.token)).status === 400);
} finally {
  const users = await User.find({ email: { $in: emails } });
  const workspaces = await Workspace.find({ owner: { $in: users.map((u) => u._id) } });
  const wsIds = workspaces.map((w) => w._id);
  await AuditJob.deleteMany({ workspace: { $in: wsIds } });
  await Issue.deleteMany({ workspace: { $in: wsIds } });
  await ActivityEvent.deleteMany({ workspace: { $in: wsIds } });
  await mongoose.connection.collection('auditruns').deleteMany({ workspace: { $in: wsIds } });
  await Page.deleteMany({ workspace: { $in: wsIds } });
  await Workspace.deleteMany({ _id: { $in: wsIds } });
  await User.deleteMany({ email: { $in: emails } });
  server.close();
  demo.kill();
  await disconnectDB();
}

process.exit(failed ? 1 : 0);
