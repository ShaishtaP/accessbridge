// Checks workspace issue routes and filters against the real database, then removes the test data.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import Page from '../src/models/Page.js';
import Issue from '../src/models/Issue.js';
import ActivityEvent from '../src/models/ActivityEvent.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
// Use the default allowlist (local demo site) regardless of local settings.
delete process.env.AUDIT_ALLOWLIST;

const stamp = Date.now();
const emails = [`is-owner-${stamp}@example.test`, `is-member-${stamp}@example.test`];
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
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body && JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

try {
  const owner = await call('POST', '/auth/register', null, { name: 'IS Owner', email: emails[0], password });
  const other = await call('POST', '/auth/register', null, { name: 'IS Member', email: emails[1], password });
  const [ownerToken, otherToken] = [owner.body.token, other.body.token];

  const ws = (await call('POST', '/workspaces', ownerToken, { name: 'Issues smoke' })).body.workspace;
  await call('POST', `/workspaces/${ws.id}/members`, ownerToken, { email: emails[1], role: 'member' });
  const page = (await call('POST', `/workspaces/${ws.id}/pages`, ownerToken, { url: 'http://localhost:4000/' })).body.page;
  const issues = `/workspaces/${ws.id}/issues`;

  const created = await call('POST', issues, otherToken, {
    pageId: page.id, title: 'Logo image has no alt text', severity: 'serious', wcag: '1.1.1',
    ruleId: 'image-alt', selector: 'header img',
  });
  check('member reports an issue (201)', created.status === 201 && created.body.issue?.status === 'open');
  await call('POST', issues, ownerToken, {
    pageId: page.id, title: 'Low contrast footer text', severity: 'moderate', wcag: '1.4.3',
  });

  check('bad WCAG criterion returns 400',
    (await call('POST', issues, ownerToken, { pageId: page.id, title: 'x', severity: 'minor', wcag: 'alt' })).status === 400);
  check('unknown severity returns 400',
    (await call('POST', issues, ownerToken, { pageId: page.id, title: 'x', severity: 'huge', wcag: '1.1.1' })).status === 400);
  check('page from outside the workspace returns 400',
    (await call('POST', issues, ownerToken, { pageId: '000000000000000000000000', title: 'x', severity: 'minor', wcag: '1.1.1' })).status === 400);

  const all = await call('GET', issues, otherToken);
  check('member lists all issues', all.status === 200 && all.body.issues.length === 2);
  const bySeverity = await call('GET', `${issues}?severity=serious`, otherToken);
  check('filter by severity', bySeverity.body.issues?.length === 1 && bySeverity.body.issues[0].wcag === '1.1.1');
  const byWcag = await call('GET', `${issues}?wcag=1.4.3&pageId=${page.id}`, otherToken);
  check('filter by WCAG criterion and page', byWcag.body.issues?.length === 1);
  check('invalid filter returns 400', (await call('GET', `${issues}?status=done`, otherToken)).status === 400);

  const issueId = created.body.issue.id;
  const updated = await call('PATCH', `${issues}/${issueId}`, otherToken, { status: 'fixed', severity: 'critical' });
  check('update status and severity',
    updated.status === 200 && updated.body.issue.status === 'fixed' && updated.body.issue.severity === 'critical');
  check('"verified" cannot be set by hand (400)',
    (await call('PATCH', `${issues}/${issueId}`, otherToken, { status: 'verified' })).status === 400);
  check('empty update returns 400', (await call('PATCH', `${issues}/${issueId}`, otherToken, {})).status === 400);

  const fixed = await call('GET', `${issues}?status=fixed`, ownerToken);
  check('filter by status', fixed.body.issues?.length === 1 && fixed.body.issues[0].id === issueId);
  check('get one issue',
    (await call('GET', `${issues}/${issueId}`, ownerToken)).body.issue?.title === 'Logo image has no alt text');
  check('unknown issue returns 404',
    (await call('GET', `${issues}/000000000000000000000000`, ownerToken)).status === 404);
  check('non-member gets 404 for the workspace issues',
    (await call('GET', '/workspaces/000000000000000000000000/issues', ownerToken)).status === 404);
} finally {
  const users = await User.find({ email: { $in: emails } });
  const workspaces = await Workspace.find({ owner: { $in: users.map((u) => u._id) } });
  const workspaceIds = workspaces.map((w) => w._id);
  await ActivityEvent.deleteMany({ workspace: { $in: workspaceIds } });
  await Issue.deleteMany({ workspace: { $in: workspaceIds } });
  await Page.deleteMany({ workspace: { $in: workspaceIds } });
  await Workspace.deleteMany({ _id: { $in: workspaceIds } });
  await User.deleteMany({ email: { $in: emails } });
  server.close();
  await disconnectDB();
}

process.exit(failed ? 1 : 0);
