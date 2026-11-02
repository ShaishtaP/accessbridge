// Checks workspace page routes and the audit allowlist against the real database, then removes the test data.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import Page from '../src/models/Page.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
// Use the default allowlist (local demo site) regardless of local settings.
delete process.env.AUDIT_ALLOWLIST;

const stamp = Date.now();
const emails = [`pg-owner-${stamp}@example.test`, `pg-member-${stamp}@example.test`];
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
  const owner = await call('POST', '/auth/register', null, { name: 'PG Owner', email: emails[0], password });
  const other = await call('POST', '/auth/register', null, { name: 'PG Member', email: emails[1], password });
  const [ownerToken, otherToken] = [owner.body.token, other.body.token];

  const ws = (await call('POST', '/workspaces', ownerToken, { name: 'Pages smoke' })).body.workspace;
  await call('POST', `/workspaces/${ws.id}/members`, ownerToken, { email: emails[1], role: 'member' });
  const pages = `/workspaces/${ws.id}/pages`;

  const created = await call('POST', pages, ownerToken, { url: 'http://localhost:4000/menu.html#prices' });
  check('owner adds allowlisted page (201)', created.status === 201);
  check('URL is normalised (hash removed)', created.body.page?.url === 'http://localhost:4000/menu.html');
  check('label defaults to the path', created.body.page?.label === '/menu.html');

  check('duplicate page returns 409',
    (await call('POST', pages, ownerToken, { url: 'http://localhost:4000/menu.html' })).status === 409);

  const external = await call('POST', pages, ownerToken, { url: 'https://example.com/' });
  check('non-allowlisted origin returns 400 with url detail',
    external.status === 400 && external.body.details?.some((d) => d.field === 'url'));
  check('non-http scheme returns 400',
    (await call('POST', pages, ownerToken, { url: 'file:///C:/Windows/win.ini' })).status === 400);
  check('embedded credentials return 400',
    (await call('POST', pages, ownerToken, { url: 'http://admin:pw@localhost:4000/' })).status === 400);
  check('not-a-URL returns 400', (await call('POST', pages, ownerToken, { url: 'menu.html' })).status === 400);

  check('plain member cannot add pages (403)',
    (await call('POST', pages, otherToken, { url: 'http://localhost:4000/about.html' })).status === 403);

  const list = await call('GET', pages, otherToken);
  check('member lists pages with the allowlist',
    list.status === 200 && list.body.pages.length === 1 && list.body.allowedOrigins.includes('http://localhost:4000'));

  const pageId = created.body.page.id;
  check('plain member cannot delete pages (403)',
    (await call('DELETE', `${pages}/${pageId}`, otherToken)).status === 403);
  check('owner deletes page (204)', (await call('DELETE', `${pages}/${pageId}`, ownerToken)).status === 204);
  check('deleting again returns 404', (await call('DELETE', `${pages}/${pageId}`, ownerToken)).status === 404);
  check('non-member gets 404 for the workspace pages',
    (await call('GET', '/workspaces/000000000000000000000000/pages', ownerToken)).status === 404);
} finally {
  const users = await User.find({ email: { $in: emails } });
  const workspaces = await Workspace.find({ owner: { $in: users.map((u) => u._id) } });
  await Page.deleteMany({ workspace: { $in: workspaces.map((w) => w._id) } });
  await Workspace.deleteMany({ _id: { $in: workspaces.map((w) => w._id) } });
  await User.deleteMany({ email: { $in: emails } });
  server.close();
  await disconnectDB();
}

process.exit(failed ? 1 : 0);
