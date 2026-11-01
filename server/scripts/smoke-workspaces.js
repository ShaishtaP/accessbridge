// Checks workspace and member routes against the real database, then removes the test data.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

const stamp = Date.now();
const emails = [`ws-owner-${stamp}@example.test`, `ws-member-${stamp}@example.test`];
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
  const owner = await call('POST', '/auth/register', null, { name: 'WS Owner', email: emails[0], password });
  const other = await call('POST', '/auth/register', null, { name: 'WS Member', email: emails[1], password });
  const [ownerToken, otherToken] = [owner.body.token, other.body.token];
  const otherId = other.body.user.id;

  check('create without token returns 401', (await call('POST', '/workspaces', null, { name: 'X' })).status === 401);
  check('create with empty name returns 400', (await call('POST', '/workspaces', ownerToken, { name: ' ' })).status === 400);

  const created = await call('POST', '/workspaces', ownerToken, { name: 'Demo Cafe' });
  const ws = created.body.workspace;
  check('create returns 201 with creator as owner',
    created.status === 201 && ws.members.length === 1 && ws.members[0].role === 'owner');

  const list = await call('GET', '/workspaces', ownerToken);
  check('list includes the workspace with myRole', list.body.workspaces?.some((w) => w.id === ws.id && w.myRole === 'owner'));

  check('non-member gets 404', (await call('GET', `/workspaces/${ws.id}`, otherToken)).status === 404);
  check('invalid id returns 400', (await call('GET', '/workspaces/not-an-id', ownerToken)).status === 400);

  const added = await call('POST', `/workspaces/${ws.id}/members`, ownerToken, { email: emails[1] });
  check('owner adds a member (201)', added.status === 201 && added.body.workspace.members.length === 2);
  check('adding the same user again returns 409',
    (await call('POST', `/workspaces/${ws.id}/members`, ownerToken, { email: emails[1] })).status === 409);

  check('member can view the workspace', (await call('GET', `/workspaces/${ws.id}`, otherToken)).status === 200);
  check('member cannot change roles (403)',
    (await call('PATCH', `/workspaces/${ws.id}/members/${otherId}`, otherToken, { role: 'admin' })).status === 403);

  const promoted = await call('PATCH', `/workspaces/${ws.id}/members/${otherId}`, ownerToken, { role: 'admin' });
  check('owner promotes member to admin',
    promoted.status === 200 && promoted.body.workspace.members.some((m) => m.userId === otherId && m.role === 'admin'));
  check('assigning "owner" role returns 400',
    (await call('PATCH', `/workspaces/${ws.id}/members/${otherId}`, ownerToken, { role: 'owner' })).status === 400);
  check('owner cannot be removed (400)',
    (await call('DELETE', `/workspaces/${ws.id}/members/${owner.body.user.id}`, otherToken)).status === 400);

  check('member can leave (204)', (await call('DELETE', `/workspaces/${ws.id}/members/${otherId}`, otherToken)).status === 204);
  check('former member gets 404', (await call('GET', `/workspaces/${ws.id}`, otherToken)).status === 404);
} finally {
  const users = await User.find({ email: { $in: emails } });
  await Workspace.deleteMany({ owner: { $in: users.map((u) => u._id) } });
  await User.deleteMany({ email: { $in: emails } });
  server.close();
  await disconnectDB();
}

process.exit(failed ? 1 : 0);
