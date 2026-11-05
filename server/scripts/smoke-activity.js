// Checks that issue and evidence changes are recorded in the activity timeline,
// then removes the test data.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import Page from '../src/models/Page.js';
import Issue from '../src/models/Issue.js';
import Evidence from '../src/models/Evidence.js';
import ActivityEvent from '../src/models/ActivityEvent.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
delete process.env.AUDIT_ALLOWLIST;

const stamp = Date.now();
const emails = [`act-owner-${stamp}@example.test`, `act-outsider-${stamp}@example.test`];
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
  const owner = await call('POST', '/auth/register', '', { name: 'Act Owner', email: emails[0], password });
  const outsider = await call('POST', '/auth/register', '', { name: 'Act Outsider', email: emails[1], password });
  const [token, outsiderToken] = [owner.body.token, outsider.body.token];

  const ws = (await call('POST', '/workspaces', token, { name: 'Activity smoke' })).body.workspace;
  const page = (await call('POST', `/workspaces/${ws.id}/pages`, token, { url: 'http://localhost:4000/menu.html' })).body.page;
  const issue = (await call('POST', `/workspaces/${ws.id}/issues`, token, {
    pageId: page.id, title: 'Menu link has no focus style', severity: 'serious', wcag: '2.4.7',
  })).body.issue;
  const issuePath = `/workspaces/${ws.id}/issues/${issue.id}`;

  await call('PATCH', issuePath, token, { status: 'in_progress', severity: 'moderate' });
  await call('PATCH', issuePath, token, { status: 'in_progress' }); // no real change
  await call('POST', `${issuePath}/evidence/notes`, token, { note: 'Tab to Menu: no visible outline.' });

  const timeline = await call('GET', `${issuePath}/activity`, token);
  const events = timeline.body.activity ?? [];
  check('issue timeline returns 200', timeline.status === 200);
  check('3 events, oldest first', events.map((e) => e.action).join() === 'issue.created,issue.updated,evidence.added');
  const update = events[1];
  check('update records status and severity changes',
    update?.changes.some((c) => c.field === 'status' && c.from === 'open' && c.to === 'in_progress') &&
    update.changes.some((c) => c.field === 'severity' && c.from === 'serious' && c.to === 'moderate'));
  check('no-op update adds no event', events.filter((e) => e.action === 'issue.updated').length === 1);
  check('evidence event has kind and phase', events[2]?.meta.kind === 'keyboard_note' && events[2].meta.phase === 'before');
  check('actor is the user who acted', events.every((e) => e.actor === owner.body.user.id));

  const feed = await call('GET', `/workspaces/${ws.id}/activity?limit=2`, token);
  check('workspace feed is newest first and respects limit',
    feed.status === 200 && feed.body.activity.length === 2 && feed.body.activity[0].action === 'evidence.added');

  check('outsider cannot read issue timeline (404)', (await call('GET', `${issuePath}/activity`, outsiderToken)).status === 404);
  check('outsider cannot read workspace feed (404)', (await call('GET', `/workspaces/${ws.id}/activity`, outsiderToken)).status === 404);
} finally {
  const users = await User.find({ email: { $in: emails } });
  const workspaces = await Workspace.find({ owner: { $in: users.map((u) => u._id) } });
  const ids = workspaces.map((w) => w._id);
  await ActivityEvent.deleteMany({ workspace: { $in: ids } });
  await Evidence.deleteMany({ workspace: { $in: ids } });
  await Issue.deleteMany({ workspace: { $in: ids } });
  await Page.deleteMany({ workspace: { $in: ids } });
  await Workspace.deleteMany({ _id: { $in: ids } });
  await User.deleteMany({ email: { $in: emails } });
  server.close();
  await disconnectDB();
}

process.exit(failed ? 1 : 0);
