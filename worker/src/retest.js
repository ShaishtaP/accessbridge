import { Issue, ActivityEvent } from './models.js';

// True when a fresh scan still reports the issue's rule on the same element.
export function stillFailing(issue, violations) {
  return violations.some(
    (v) => v.ruleId === issue.ruleId && v.nodes.some((n) => n.selector.slice(0, 500) === issue.selector)
  );
}

// Moves a "fixed" issue to "verified" or "reopened" based on the new scan.
// Only the status changes: evidence and earlier timeline events stay on the same issue.
export async function applyRetest(job, auditRunId, violations) {
  const issue = await Issue.findOne({ _id: job.retestIssue, workspace: job.workspace });
  // The issue may have been edited while the job waited; only a still-"fixed" issue is judged.
  if (!issue || issue.status !== 'fixed') return { issueId: String(job.retestIssue), outcome: 'skipped' };

  const outcome = stillFailing(issue, violations) ? 'reopened' : 'verified';
  issue.status = outcome;
  await issue.save();
  await ActivityEvent.create({
    workspace: job.workspace,
    issue: issue._id,
    actor: job.requestedBy,
    action: 'issue.retested',
    changes: [{ field: 'status', from: 'fixed', to: outcome }],
    meta: { auditRunId: auditRunId.toString(), jobId: job._id.toString() },
  });
  return { issueId: issue._id.toString(), outcome };
}
