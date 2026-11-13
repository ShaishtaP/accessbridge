import { readFile } from 'node:fs/promises';
import AuditJob from '../models/AuditJob.js';
import Issue, { SEVERITIES, STATUSES } from '../models/Issue.js';
import Page from '../models/Page.js';
import { allowedOrigins } from '../config/allowlist.js';
import { latencyStats } from '../middleware/latency.js';
import { summarize } from '../utils/stats.js';
import { loadForMember } from '../utils/workspaceAccess.js';

const SEEDED_FILE = new URL('../../../demo-site/seeded-defects.json', import.meta.url);

// The ground-truth list is optional (it ships with the demo site), so a missing file means "no recall".
async function loadSeededDefects() {
  try {
    return JSON.parse(await readFile(SEEDED_FILE, 'utf8')).defects;
  } catch {
    return null;
  }
}

// Demo page file name for a page URL on a dev-allowlisted origin ("/" is index.html).
function demoFileName(page) {
  const url = new URL(page.url);
  if (!allowedOrigins().includes(url.origin)) return null;
  return url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
}

// Recall against the seeded demo defects, counted only for demo pages added to this workspace.
// A defect is found when an issue on its page carries its expected axe rule (any status counts).
async function demoRecall(workspaceId, issues) {
  const seeded = await loadSeededDefects();
  if (!seeded) return null;

  const pages = await Page.find({ workspace: workspaceId });
  const pageIdsByFile = {};
  for (const page of pages) {
    const file = demoFileName(page);
    if (file) (pageIdsByFile[file] ||= []).push(page._id.toString());
  }

  const inScope = seeded.filter((d) => pageIdsByFile[d.page]);
  if (inScope.length === 0) return null;

  const automatable = inScope.filter((d) => d.axeRule);
  const found = automatable.filter((d) =>
    issues.some((i) => pageIdsByFile[d.page].includes(i.page.toString()) && i.ruleId === d.axeRule));
  return {
    seededTotal: inScope.length,
    automatable: automatable.length,
    found: found.length,
    rate: automatable.length ? Math.round((found.length / automatable.length) * 1000) / 10 : null,
    missed: automatable.filter((d) => !found.includes(d)).map((d) => ({ id: d.id, page: d.page, axeRule: d.axeRule })),
  };
}

function countBy(items, key, keys) {
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const item of items) counts[item[key]] += 1;
  return counts;
}

// Any member can read the workspace metrics.
export async function workspaceMetrics(req, res) {
  const { workspace } = await loadForMember(req);

  const issues = await Issue.find({ workspace: workspace._id }, 'page ruleId status severity');
  const byStatus = countBy(issues, 'status', STATUSES);

  const jobs = await AuditJob.find({ workspace: workspace._id, status: { $in: ['done', 'failed'] } });
  const audits = jobs.filter((j) => !j.retestIssue);
  const retests = jobs.filter((j) => j.retestIssue);
  const done = audits.filter((j) => j.status === 'done');

  res.json({
    metrics: {
      issues: {
        total: issues.length,
        byStatus,
        bySeverity: countBy(issues, 'severity', SEVERITIES),
      },
      fixes: {
        verified: byStatus.verified,
        awaitingRetest: byStatus.fixed,
        reopened: byStatus.reopened,
        retestsRun: retests.length,
      },
      audits: {
        done: done.length,
        failed: audits.length - done.length,
        // Time spent scanning the page in the browser.
        scanMs: summarize(done.map((j) => j.result?.durationMs).filter((ms) => typeof ms === 'number')),
        // From "Run audit" to finished, including time waiting in the queue.
        totalMs: summarize(done.filter((j) => j.finishedAt).map((j) => j.finishedAt - j.createdAt)),
      },
      recall: await demoRecall(workspace._id, issues),
      api: latencyStats(),
    },
  });
}
