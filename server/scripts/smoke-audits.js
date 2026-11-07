// Checks the audit job queue end to end against the real database: queue a job through the API,
// run the worker once against the local demo site, confirm the job finished, then remove the test data.
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
const emails = [`au-owner-${stamp}@example.test`, `au-outsider-${stamp}@example.test`];
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
  const owner = (await call('POST', '/auth/register', null, { name: 'AU Owner', email: emails[0], password })).body;
  const outsider = (await call('POST', '/auth/register', null, { name: 'AU Out', email: emails[1], password })).body;

  const ws = (await call('POST', '/workspaces', owner.token, { name: 'Audits smoke' })).body.workspace;
  const page = (await call('POST', `/workspaces/${ws.id}/pages`, owner.token, { url: 'http://localhost:4000/menu.html' })).body.page;
  const audits = `/workspaces/${ws.id}/audits`;

  const queued = await call('POST', audits, owner.token, { pageId: page.id });
  check('member queues an audit (201, status queued)', queued.status === 201 && queued.body.job?.status === 'queued');
  check('job keeps a snapshot of the page URL', queued.body.job?.url === page.url);
  check('second audit for the same page returns 409', (await call('POST', audits, owner.token, { pageId: page.id })).status === 409);
  check('invalid pageId returns 400', (await call('POST', audits, owner.token, { pageId: 'abc' })).status === 400);
  check('unknown page returns 404', (await call('POST', audits, owner.token, { pageId: '0'.repeat(24) })).status === 404);
  check('non-member gets 404', (await call('POST', audits, outsider.token, { pageId: page.id })).status === 404);

  const list = await call('GET', audits, owner.token);
  check('list shows the queued job', list.status === 200 && list.body.jobs?.[0]?.id === queued.body.job.id);

  // Run the worker until the queue is empty, exactly as `npm run once` does in worker/.
  execFileSync(process.execPath, [workerEntry, '--once'], { stdio: 'ignore', timeout: 120000 });

  const done = (await call('GET', `${audits}/${queued.body.job.id}`, owner.token)).body.job;
  check('worker marks the job done', done?.status === 'done');
  check('job records one attempt and an audit result',
    done?.attempts === 1 && done?.result?.auditRunId && done.result.violationCount > 0);

  const found = await call('GET', `/workspaces/${ws.id}/issues?pageId=${page.id}`, owner.token);
  check('audit findings are listed as issues through the API',
    found.status === 200 && found.body.issues?.length === done?.result?.issuesCreated);
  check('a new audit can be queued once the last one finished',
    (await call('POST', audits, owner.token, { pageId: page.id })).status === 201);
  check('status filter returns only queued jobs',
    (await call('GET', `${audits}?status=queued`, owner.token)).body.jobs?.every((j) => j.status === 'queued'));
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
