import { scanPage } from './scanner.js';
import { AuditRun, Issue, ActivityEvent } from './models.js';
import { applyRetest } from './retest.js';

// Issues in these states are finished; a new finding at the same spot opens a fresh issue.
const CLOSED_STATUSES = ['verified', 'wont_fix'];
const SEVERITIES = ['critical', 'serious', 'moderate', 'minor'];

// Finds an existing, still-active issue for the same rule at the same element, or creates one.
async function upsertIssue(job, violation, node, auditRunId) {
  const match = {
    workspace: job.workspace,
    page: job.page,
    ruleId: violation.ruleId,
    selector: node.selector.slice(0, 500),
    status: { $nin: CLOSED_STATUSES },
  };
  const existing = await Issue.findOne(match).select('_id');
  if (existing) return { id: existing._id, created: false };

  const issue = await Issue.create({
    workspace: job.workspace,
    page: job.page,
    title: violation.help.slice(0, 140),
    description: `${node.failureSummary}\n\nMore: ${violation.helpUrl}`.slice(0, 2000),
    severity: SEVERITIES.includes(violation.impact) ? violation.impact : 'moderate',
    wcag: violation.wcag,
    ruleId: violation.ruleId,
    selector: match.selector,
    createdBy: job.requestedBy,
  });
  await ActivityEvent.create({
    workspace: job.workspace,
    issue: issue._id,
    actor: job.requestedBy,
    action: 'issue.created',
    meta: { source: 'audit', auditRunId: auditRunId.toString(), jobId: job._id.toString() },
  });
  return { id: issue._id, created: true };
}

// Scans the page, stores the AuditRun, and turns every failing element into a tracked issue.
// Returns a small summary that is saved on the job.
export async function runAudit(job) {
  const scan = await scanPage(job.url);

  const run = new AuditRun({
    workspace: job.workspace,
    page: job.page,
    job: job._id,
    url: scan.url,
    engine: scan.engine,
    durationMs: scan.durationMs,
    violationCount: scan.violations.length,
    nodeCount: scan.violations.reduce((sum, v) => sum + v.nodes.length, 0),
    violations: scan.violations,
    incompleteRuleIds: scan.incompleteRuleIds,
  });

  for (const violation of scan.violations) {
    for (const node of violation.nodes) {
      const { id, created } = await upsertIssue(job, violation, node, run._id);
      (created ? run.issuesCreated : run.issuesExisting).push(id);
    }
  }
  // A retest job also judges the issue it was queued for, using this run's findings.
  if (job.retestIssue) run.retest = await applyRetest(job, run._id, scan.violations);
  await run.save();

  return {
    auditRunId: run._id.toString(),
    engine: scan.engine,
    durationMs: scan.durationMs,
    violationCount: run.violationCount,
    nodeCount: run.nodeCount,
    issuesCreated: run.issuesCreated.length,
    issuesExisting: run.issuesExisting.length,
    ruleIds: scan.violations.map((v) => v.ruleId),
    retest: run.retest,
  };
}
