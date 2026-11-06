import AuditJob from '../models/AuditJob.js';
import Page from '../models/Page.js';
import { httpError } from '../utils/httpError.js';
import { loadForMember } from '../utils/workspaceAccess.js';

// Any member can queue an audit for a page in the workspace.
export async function createAudit(req, res) {
  const { workspace } = await loadForMember(req);
  const page = await Page.findOne({ _id: req.body.pageId, workspace: workspace._id });
  if (!page) throw httpError(404, 'Page not found');

  // One pending audit per page keeps repeated clicks from flooding the queue.
  const pending = await AuditJob.exists({ page: page._id, status: { $in: ['queued', 'running'] } });
  if (pending) throw httpError(409, 'An audit for this page is already queued or running');

  const job = await AuditJob.create({
    workspace: workspace._id,
    page: page._id,
    url: page.url,
    requestedBy: req.user._id,
  });
  res.status(201).json({ job: job.toPublic() });
}

export async function listAudits(req, res) {
  const { workspace } = await loadForMember(req);
  const filter = { workspace: workspace._id };
  if (req.query.status) filter.status = String(req.query.status);
  const jobs = await AuditJob.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json({ jobs: jobs.map((j) => j.toPublic()) });
}

export async function getAudit(req, res) {
  const { workspace } = await loadForMember(req);
  const job = await AuditJob.findOne({ _id: req.params.jobId, workspace: workspace._id });
  if (!job) throw httpError(404, 'Audit job not found');
  res.json({ job: job.toPublic() });
}
