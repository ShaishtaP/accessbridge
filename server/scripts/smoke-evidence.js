// Checks evidence notes, screenshot uploads and downloads against the real database,
// then removes the test data and uploaded files.
import dotenv from 'dotenv';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { UPLOAD_DIR } from '../src/config/uploads.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import Page from '../src/models/Page.js';
import Issue from '../src/models/Issue.js';
import Evidence from '../src/models/Evidence.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
delete process.env.AUDIT_ALLOWLIST;

const stamp = Date.now();
const emails = [`ev-owner-${stamp}@example.test`, `ev-outsider-${stamp}@example.test`];
const password = 'smoke-pass-123';
// Smallest valid PNG: a single transparent pixel.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);
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
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + path, { method, headers, body: payload });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, type, body: data };
}

function upload(bytes, mimeType, fields = {}) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mimeType }), 'shot.png');
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}

let workspaceId;
try {
  const owner = await call('POST', '/auth/register', '', { name: 'EV Owner', email: emails[0], password });
  const outsider = await call('POST', '/auth/register', '', { name: 'EV Outsider', email: emails[1], password });
  const [token, outsiderToken] = [owner.body.token, outsider.body.token];

  const ws = (await call('POST', '/workspaces', token, { name: 'Evidence smoke' })).body.workspace;
  workspaceId = ws.id;
  const page = (await call('POST', `/workspaces/${ws.id}/pages`, token, { url: 'http://localhost:4000/index.html' })).body.page;
  const issue = (await call('POST', `/workspaces/${ws.id}/issues`, token, {
    pageId: page.id, title: 'Hero image has no alt text', severity: 'critical', wcag: '1.1.1',
  })).body.issue;
  const evidence = `/workspaces/${ws.id}/issues/${issue.id}/evidence`;

  const note = await call('POST', `${evidence}/notes`, token, { note: 'Tab x3: focus skips the Reserve button.' });
  check('keyboard note added (201, phase defaults to before)', note.status === 201 && note.body.evidence.phase === 'before');
  check('empty keyboard note returns 400', (await call('POST', `${evidence}/notes`, token, { note: ' ' })).status === 400);

  const shot = await call('POST', `${evidence}/screenshots`, token, upload(PNG, 'image/png', { caption: 'Hero', phase: 'after' }));
  check('PNG screenshot uploaded (201)', shot.status === 201 && shot.body.evidence.file?.size === PNG.length);
  check('caption and phase saved', shot.body.evidence?.note === 'Hero' && shot.body.evidence.phase === 'after');

  const file = await call('GET', `${evidence}/${shot.body.evidence.id}/file`, token);
  check('screenshot downloads with image/png and same bytes', file.status === 200 && file.type === 'image/png' && PNG.equals(file.body));
  check('outsider cannot download (404)', (await call('GET', `${evidence}/${shot.body.evidence.id}/file`, outsiderToken)).status === 404);

  check('text disguised as PNG rejected (415)',
    (await call('POST', `${evidence}/screenshots`, token, upload(Buffer.from('not an image'), 'image/png'))).status === 415);
  check('PDF upload rejected (415)',
    (await call('POST', `${evidence}/screenshots`, token, upload(Buffer.from('%PDF-1.7'), 'application/pdf'))).status === 415);
  check('file over 5 MB rejected (413)',
    (await call('POST', `${evidence}/screenshots`, token, upload(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png'))).status === 413);
  check('upload without a file returns 400',
    (await call('POST', `${evidence}/screenshots`, token, new FormData())).status === 400);

  const list = await call('GET', evidence, token);
  check('list returns 2 items, oldest first',
    list.status === 200 && list.body.evidence.length === 2 && list.body.evidence[0].kind === 'keyboard_note');
  check('outsider cannot list evidence (404)', (await call('GET', evidence, outsiderToken)).status === 404);
} finally {
  const users = await User.find({ email: { $in: emails } });
  const workspaces = await Workspace.find({ owner: { $in: users.map((u) => u._id) } });
  const ids = workspaces.map((w) => w._id);
  await Evidence.deleteMany({ workspace: { $in: ids } });
  await Issue.deleteMany({ workspace: { $in: ids } });
  await Page.deleteMany({ workspace: { $in: ids } });
  await Workspace.deleteMany({ _id: { $in: ids } });
  await User.deleteMany({ email: { $in: emails } });
  if (workspaceId) await rm(join(UPLOAD_DIR, workspaceId), { recursive: true, force: true });
  server.close();
  await disconnectDB();
}

process.exit(failed ? 1 : 0);
