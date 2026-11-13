// Checks the workspace metrics endpoint: issue counts, verified fixes, audit timings,
// recall against the seeded demo defects and API latency, then removes the test data.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { percentile } from '../src/utils/stats.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import Page from '../src/models/Page.js';
import Issue from '../src/models/Issue.js';
import AuditJob from '../src/models/AuditJob.js';
import ActivityEvent from '../src/models/ActivityEvent.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
delete process.env.AUDIT_ALLOWLIST;

const stamp = Date.now();
const emails = [`met-owner-${stamp}@example.test`, `met-outsider-${stamp}@example.test`];
const password = 'smoke-pass-123';
let failed = false;

function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed = true;
}

await connectDB(process.env.MONGODB_URI);
const server = createApp().listen(0);
const base = `http://localhost:${server.address().port}/api`;

async function call(method, path, token, body) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}

try {
  const hundred = Array.from({ length: 100 }, (_, i) => i + 1);
  check('percentile uses nearest rank (p95 of 1..100 is 95, p50 is 50)',
    percentile(hundred, 95) === 95 && percentile(hundred, 50) === 50 && percentile([], 95) === null);

  const owner = await call('POST', '/auth/register', '', { name: 'Met Owner', email: emails[0], password });
  const outsider = await call('POST', '/auth/register', '', { name: 'Met Outsider', email: emails[1], password });
  const [token, outsiderToken] = [owner.body.token, outsider.body.token];
  const ws = (await call('POST', '/workspaces', token, { name: 'Metrics smoke' })).body.workspace;
  const metricsPath = `/workspaces/${ws.id}/metrics`;

  const empty = await call('GET', metricsPath, token);
  check('empty workspace: 200, no issues, no audits, no recall',
    empty.status === 200 && empty.body.metrics.issues.total === 0 &&
    empty.body.metrics.audits.done === 0 && empty.body.metrics.audits.scanMs.p95 === null &&
    empty.body.metrics.recall === null);

  // "/" stands for the demo home page (index.html).
  const home = (await call('POST', `/workspaces/${ws.id}/pages`, token, { url: 'http://localhost:4000/' })).body.page;
  const menu = (await call('POST', `/workspaces/${ws.id}/pages`, token, { url: 'http://localhost:4000/menu.html' })).body.page;
  const newIssue = (pageId, ruleId, wcag) => call('POST', `/workspaces/${ws.id}/issues`, token, {
    pageId, title: `Smoke ${ruleId || 'manual'}`, severity: 'serious', wcag, ...(ruleId ? { ruleId } : {}),
  });
  const alt = (await newIssue(home.id, 'image-alt', '1.1.1')).body.issue;
  await newIssue(home.id, 'color-contrast', '1.4.3');
  await newIssue(home.id, null, '2.4.7');
  const list = (await newIssue(menu.id, 'list', '1.3.1')).body.issue;

  await call('PATCH', `/workspaces/${ws.id}/issues/${alt.id}`, token, { status: 'fixed' });
  // "verified" is only set by the retest worker, so it is written directly here.
  await Issue.updateOne({ _id: list.id }, { status: 'verified' });

  // Finished jobs are inserted directly with known timings: scans of 100..2000 ms, totals of 1..20 s.
  const t0 = new Date('2026-01-01T00:00:00Z').getTime();
  const oid = (id) => new mongoose.Types.ObjectId(id);
  const job = (extra) => ({
    workspace: oid(ws.id), page: oid(home.id), url: home.url, attempts: 1,
    requestedBy: oid(owner.body.user.id), retestIssue: null,
    createdAt: new Date(t0), startedAt: new Date(t0), ...extra,
  });
  await AuditJob.collection.insertMany([
    ...Array.from({ length: 20 }, (_, i) => job({
      status: 'done', result: { durationMs: (i + 1) * 100 }, finishedAt: new Date(t0 + (i + 1) * 1000),
    })),
    job({ status: 'failed', error: 'timeout', finishedAt: new Date(t0 + 5000) }),
    job({ status: 'done', retestIssue: oid(alt.id), result: { durationMs: 50 }, finishedAt: new Date(t0 + 500) }),
  ]);

  const res = await call('GET', metricsPath, token);
  const m = res.body.metrics;
  check('metrics returns 200', res.status === 200);
  check('issue counts by status and severity',
    m.issues.total === 4 && m.issues.byStatus.open === 2 && m.issues.byStatus.fixed === 1 &&
    m.issues.byStatus.verified === 1 && m.issues.bySeverity.serious === 4);
  check('fixes: 1 verified, 1 awaiting retest, 1 retest run',
    m.fixes.verified === 1 && m.fixes.awaitingRetest === 1 && m.fixes.retestsRun === 1);
  check('audits: 20 done, 1 failed, retests excluded', m.audits.done === 20 && m.audits.failed === 1);
  check('scan time p50 1000 ms, p95 1900 ms, avg 1050 ms',
    m.audits.scanMs.p50 === 1000 && m.audits.scanMs.p95 === 1900 && m.audits.scanMs.avg === 1050);
  check('total time (queue + scan) p95 19000 ms', m.audits.totalMs.p95 === 19000 && m.audits.totalMs.max === 20000);
  check('recall counts only seeded defects on this workspace\'s demo pages (14 seeded, 10 automatable)',
    m.recall?.seededTotal === 14 && m.recall?.automatable === 10);
  check('recall: 3 of 10 found (30%), any status counts, 7 listed as missed',
    m.recall?.found === 3 && m.recall?.rate === 30 && m.recall?.missed.length === 7);
  check('API latency has samples with p95 >= p50',
    m.api.count > 0 && m.api.p95 >= m.api.p50 && m.api.window === 1000);

  check('outsider cannot read metrics (404)', (await call('GET', metricsPath, outsiderToken)).status === 404);
  check('metrics need a login (401)', (await call('GET', metricsPath, '')).status === 401);
} finally {
  const users = await User.find({ email: { $in: emails } });
  const workspaces = await Workspace.find({ owner: { $in: users.map((u) => u._id) } });
  const ids = workspaces.map((w) => w._id);
  await AuditJob.deleteMany({ workspace: { $in: ids } });
  await ActivityEvent.deleteMany({ workspace: { $in: ids } });
  await Issue.deleteMany({ workspace: { $in: ids } });
  await Page.deleteMany({ workspace: { $in: ids } });
  await Workspace.deleteMany({ _id: { $in: ids } });
  await User.deleteMany({ email: { $in: emails } });
  server.close();
  await disconnectDB();
}

process.exit(failed ? 1 : 0);
