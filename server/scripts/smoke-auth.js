// Checks register/login against the real database, then removes the test user.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

const email = `smoke-${Date.now()}@example.test`;
const password = 'smoke-pass-123';
let failed = false;

function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed = true;
}

await connectDB(process.env.MONGODB_URI);
const server = createApp().listen(0);
const base = `http://localhost:${server.address().port}/api/auth`;

async function post(path, body) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function getMe(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${base}/me`, { headers });
  return { status: res.status, body: await res.json() };
}

try {
  const reg = await post('/register', { name: 'Smoke Test', email, password });
  check('register returns 201 with token', reg.status === 201 && typeof reg.body.token === 'string');
  check('register hides password hash', !('passwordHash' in (reg.body.user || {})));

  const dup = await post('/register', { name: 'Smoke Test', email, password });
  check('duplicate email returns 409', dup.status === 409);

  const short = await post('/register', { name: 'x', email: `x${email}`, password: '123' });
  check('short password returns 400', short.status === 400);

  const ok = await post('/login', { email, password });
  check('login returns 200 with token', ok.status === 200 && typeof ok.body.token === 'string');

  const bad = await post('/login', { email, password: 'wrong-password' });
  check('wrong password returns 401', bad.status === 401);

  const invalid = await post('/register', { name: 'Smoke Test', email: 'not-an-email', password });
  check('invalid email returns 400 with field details',
    invalid.status === 400 && invalid.body.details?.some((d) => d.field === 'email'));

  const malformed = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email": ',
  });
  check('malformed JSON returns 400', malformed.status === 400);

  const meOk = await getMe(ok.body.token);
  check('GET /me with token returns the user', meOk.status === 200 && meOk.body.user?.email === email);

  check('GET /me without token returns 401', (await getMe()).status === 401);
  check('GET /me with a fake token returns 401', (await getMe('not.a.real.token')).status === 401);
} finally {
  await User.deleteOne({ email });
  server.close();
  await disconnectDB();
}

process.exit(failed ? 1 : 0);
