// End-to-end audit check: serves the demo site, queues one job per page, runs them through the
// worker, measures recall against demo-site/seeded-defects.json, then removes the test data.
import dotenv from 'dotenv';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import AuditJob from '../src/AuditJob.js';
import { AuditRun, Issue, ActivityEvent } from '../src/models.js';
import { processNextJob } from '../src/worker.js';
import { closeBrowser } from '../src/scanner.js';

dotenv.config({ path: fileURLToPath(new URL('../../server/.env', import.meta.url)), quiet: true });
delete process.env.AUDIT_ALLOWLIST; // default allowlist = local demo site

const PAGES = ['index.html', 'menu.html', 'about.html', 'contact.html'];
const seeded = JSON.parse(await readFile(new URL('../../demo-site/seeded-defects.json', import.meta.url), 'utf8')).defects;
const workspace = new mongoose.Types.ObjectId();
const requestedBy = new mongoose.Types.ObjectId();
const pageIds = Object.fromEntries(PAGES.map((p) => [p, new mongoose.Types.ObjectId()]));
const workerId = `smoke-${process.pid}`;
let failed = false;

function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed = true;
}

function enqueue(page, url = `http://localhost:4000/${page}`) {
  return AuditJob.create({ workspace, page: pageIds[page], url, requestedBy, status: 'queued', attempts: 0 });
}

async function drain() {
  while (await processNextJob(workerId));
}

const demo = spawn(process.execPath, [fileURLToPath(new URL('../../demo-site/server.js', import.meta.url))]);
await new Promise((resolve) => demo.stdout.once('data', resolve));
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

try {
  const jobs = await Promise.all(PAGES.map((p) => enqueue(p)));
  await drain();

  const done = await AuditJob.find({ _id: { $in: jobs.map((j) => j._id) } });
  check('all 4 page audits finish with status "done"', done.every((j) => j.status === 'done'));
  check('one AuditRun is stored per page', (await AuditRun.countDocuments({ workspace })) === 4);

  const issues = await Issue.find({ workspace });
  const events = await ActivityEvent.countDocuments({ workspace, action: 'issue.created' });
  check('violations become issues, each with an "issue.created" event', issues.length > 0 && events === issues.length);
  check('issues carry severity, WCAG and rule id',
    issues.every((i) => i.severity && i.wcag && i.ruleId && i.status === 'open'));

  // Recall: a seeded defect counts as found when an issue exists on its page for its expected axe rule.
  const automatable = seeded.filter((d) => d.axeRule);
  const found = automatable.filter((d) =>
    issues.some((i) => i.page.equals(pageIds[d.page]) && i.ruleId === d.axeRule));
  const missed = automatable.filter((d) => !found.includes(d)).map((d) => `${d.id} (${d.axeRule})`);
  console.log(`      recall: ${found.length}/${automatable.length} automatable seeded defects ` +
    `(${Math.round((found.length / automatable.length) * 100)}%), ${found.length}/${seeded.length} of all seeded defects; ` +
    `missed: ${missed.join(', ') || 'none'}`);
  check('recall on automatable defects is at least 90%', found.length / automatable.length >= 0.9);

  const before = issues.length;
  const rerun = await enqueue('index.html');
  await drain();
  const rerunJob = await AuditJob.findById(rerun._id);
  check('re-auditing a page reuses open issues instead of duplicating them',
    rerunJob.result?.issuesCreated === 0 && rerunJob.result?.issuesExisting > 0 &&
    (await Issue.countDocuments({ workspace })) === before);

  const blocked = await AuditJob.create({
    workspace, page: pageIds['index.html'], url: 'https://example.com/', requestedBy, status: 'queued', attempts: 0,
  });
  await drain();
  const blockedJob = await AuditJob.findById(blocked._id);
  check('non-allowlisted URL is refused and fails after 3 attempts',
    blockedJob.status === 'failed' && blockedJob.attempts === 3 && /allowlist/.test(blockedJob.error));
} finally {
  await Promise.all([
    Issue.deleteMany({ workspace }),
    ActivityEvent.deleteMany({ workspace }),
    AuditRun.deleteMany({ workspace }),
    AuditJob.deleteMany({ workspace }),
  ]);
  await closeBrowser();
  await mongoose.disconnect();
  demo.kill();
}

process.exit(failed ? 1 : 0);
