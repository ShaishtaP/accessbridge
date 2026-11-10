// Checks the workspace site list, ownership proofs and site-based page rules against the real
// database, then removes the test data.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { findProof } from '../src/utils/siteVerification.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import Page from '../src/models/Page.js';
import Site from '../src/models/Site.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
delete process.env.AUDIT_ALLOWLIST;

const stamp = Date.now();
const emails = [`st-owner-${stamp}@example.test`, `st-member-${stamp}@example.test`];
const password = 'smoke-pass-123';
let failed = false;

function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed = true;
}

// The proof matcher is pure, so it is checked without any network access.
const token = 'accessbridge-0123456789abcdef0123456789abcdef';
check('meta tag proof is found', findProof(token, { html: `<head><meta name="accessbridge-verification" content="${token}"></head>` }) === 'meta');
check('meta tag with spaces around = is found', findProof(token, { html: `<meta name = "accessbridge-verification" content = "${token}" />` }) === 'meta');
check('well-known file proof is found', findProof(token, { file: `other\n${token}\n` }) === 'file');
check('wrong token is rejected', findProof(token, { html: '<meta name="accessbridge-verification" content="accessbridge-nope">', file: 'nope' }) === null);

await connectDB(process.env.MONGODB_URI);
const server = createApp().listen(0);
const base = `http://localhost:${server.address().port}/api`;

async function call(method, path, auth, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const res = await fetch(base + path, { method, headers, body: body && JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

try {
  const owner = await call('POST', '/auth/register', null, { name: 'ST Owner', email: emails[0], password });
  const member = await call('POST', '/auth/register', null, { name: 'ST Member', email: emails[1], password });
  const [ownerToken, memberToken] = [owner.body.token, member.body.token];

  const ws = (await call('POST', '/workspaces', ownerToken, { name: 'Sites smoke' })).body.workspace;
  await call('POST', `/workspaces/${ws.id}/members`, ownerToken, { email: emails[1], role: 'member' });
  const sites = `/workspaces/${ws.id}/sites`;
  const pages = `/workspaces/${ws.id}/pages`;

  const created = await call('POST', sites, ownerToken, { url: 'https://example.com/some/path' });
  const site = created.body.site;
  check('owner registers a site by origin (201, pending)',
    created.status === 201 && site?.origin === 'https://example.com' && site.status === 'pending');
  check('site comes with a token, meta tag and well-known URL',
    site?.verification.metaTag.includes(site.verification.token) &&
    site.verification.fileUrl === 'https://example.com/.well-known/accessbridge.txt');

  for (const [url, label] of [
    ['http://example.org', 'plain http'],
    ['https://93.184.215.14', 'an IP address'],
    ['https://intranet.local', 'a .local host'],
    ['https://user:pw@example.org', 'embedded credentials'],
  ]) {
    check(`site with ${label} is rejected (400)`, (await call('POST', sites, ownerToken, { url })).status === 400);
  }
  check('duplicate site returns 409', (await call('POST', sites, ownerToken, { url: 'https://example.com' })).status === 409);
  check('plain member cannot add sites (403)',
    (await call('POST', sites, memberToken, { url: 'https://example.org' })).status === 403);

  const list = await call('GET', sites, memberToken);
  check('member lists sites with the local origins',
    list.status === 200 && list.body.sites.length === 1 && list.body.localOrigins.includes('http://localhost:4000'));

  const pendingPage = await call('POST', pages, ownerToken, { url: 'https://example.com/about' });
  check('page on a pending site is rejected (400, url detail)',
    pendingPage.status === 400 && pendingPage.body.details?.some((d) => d.field === 'url'));

  // example.com does not publish this workspace's token, so verification must fail and stay pending.
  const verify = await call('POST', `${sites}/${site.id}/verify`, ownerToken);
  const afterVerify = await Site.findById(site.id);
  check('verification without the token returns 422 and stays pending',
    verify.status === 422 && afterVerify.status === 'pending' && afterVerify.lastCheckError !== '');

  // Simulate a successful proof to check what verified sites unlock.
  await Site.updateOne({ _id: site.id }, { status: 'verified', verifiedAt: new Date(), verifiedBy: 'meta' });
  const verifiedPage = await call('POST', pages, ownerToken, { url: 'https://example.com/about#team' });
  check('page on a verified site is accepted (201, normalised)',
    verifiedPage.status === 201 && verifiedPage.body.page?.url === 'https://example.com/about');
  check('page list includes the verified origin',
    (await call('GET', pages, memberToken)).body.allowedOrigins?.includes('https://example.com'));
  check('other public origins are still rejected',
    (await call('POST', pages, ownerToken, { url: 'https://example.org/' })).status === 400);
  check('local demo pages still work',
    (await call('POST', pages, ownerToken, { url: 'http://localhost:4000/menu.html' })).status === 201);

  check('plain member cannot delete sites (403)', (await call('DELETE', `${sites}/${site.id}`, memberToken)).status === 403);
  check('owner deletes the site (204)', (await call('DELETE', `${sites}/${site.id}`, ownerToken)).status === 204);
  check('pages on a removed site can no longer be added',
    (await call('POST', pages, ownerToken, { url: 'https://example.com/contact' })).status === 400);
} finally {
  const users = await User.find({ email: { $in: emails } });
  const workspaces = await Workspace.find({ owner: { $in: users.map((u) => u._id) } });
  const ids = workspaces.map((w) => w._id);
  await Page.deleteMany({ workspace: { $in: ids } });
  await Site.deleteMany({ workspace: { $in: ids } });
  await Workspace.deleteMany({ _id: { $in: ids } });
  await User.deleteMany({ email: { $in: emails } });
  server.close();
  await disconnectDB();
}

process.exit(failed ? 1 : 0);
