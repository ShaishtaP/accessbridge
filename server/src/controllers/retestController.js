import AuditJob from '../models/AuditJob.js';
import Page from '../models/Page.js';
import { httpError } from '../utils/httpError.js';
import { loadForMember } from '../utils/workspaceAccess.js';
import { recordActivity } from '../utils/activity.js';
import { findIssue } from './issueController.js';

// Queues a retest for an issue marked "fixed". The worker re-scans the page and moves the
// issue to "verified" or "reopened". The issue keeps its id, so its original evidence and
// timeline stay attached whatever the outcome.
export async function requestRetest(req, res) {
  const { workspace } = await loadForMember(req);
  const issue = await findIssue(workspace, req.params.issueId);

  if (issue.status !== 'fixed') throw httpError(409, 'Only issues marked fixed can be retested');
  // A retest compares the rule and element against a fresh scan, so both must be known.
  if (!issue.ruleId || !issue.selector) {
    throw httpError(400, 'Retest needs an automated rule id and selector on the issue');
  }

  const page = await Page.findOne({ _id: issue.page, workspace: workspace._id });
  if (!page) throw httpError(404, 'Page not found');

  const pending = await AuditJob.exists({ page: page._id, status: { $in: ['queued', 'running'] } });
  if (pending) throw httpError(409, 'An audit for this page is already queued or running');

  const job = await AuditJob.create({
    workspace: workspace._id,
    page: page._id,
    url: page.url,
    requestedBy: req.user._id,
    retestIssue: issue._id,
  });
  await recordActivity({
    workspace: workspace._id,
    issue: issue._id,
    actor: req.user._id,
    action: 'issue.retest_requested',
    meta: { jobId: job._id.toString() },
  });
  res.status(201).json({ job: job.toPublic() });
}
