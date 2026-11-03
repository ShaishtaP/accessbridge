import Issue from '../models/Issue.js';
import Page from '../models/Page.js';
import { issueFilterSchema } from '../schemas/issueSchemas.js';
import { httpError } from '../utils/httpError.js';
import { loadForMember } from '../utils/workspaceAccess.js';

// Any member can list issues, optionally filtered by status, severity, page or WCAG criterion.
export async function listIssues(req, res) {
  const { workspace } = await loadForMember(req);

  const parsed = issueFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw httpError(400, 'Invalid filter', details);
  }
  const { status, severity, pageId, wcag } = parsed.data;

  const query = { workspace: workspace._id };
  if (status) query.status = status;
  if (severity) query.severity = severity;
  if (pageId) query.page = pageId;
  if (wcag) query.wcag = wcag;

  const issues = await Issue.find(query).sort({ createdAt: -1 });
  res.json({ issues: issues.map((i) => i.toPublic()) });
}

// Any member can report an issue, but only on a page that belongs to this workspace.
export async function createIssue(req, res) {
  const { workspace } = await loadForMember(req);
  const { pageId, ...fields } = req.body;

  const page = await Page.exists({ _id: pageId, workspace: workspace._id });
  if (!page) throw httpError(400, 'Page not found in this workspace');

  const issue = await Issue.create({
    ...fields,
    workspace: workspace._id,
    page: pageId,
    createdBy: req.user._id,
  });
  res.status(201).json({ issue: issue.toPublic() });
}

async function findIssue(workspace, issueId) {
  // Scoped to the workspace so an issue id from another workspace isn't reachable here.
  const issue = await Issue.findOne({ _id: issueId, workspace: workspace._id });
  if (!issue) throw httpError(404, 'Issue not found');
  return issue;
}

export async function getIssue(req, res) {
  const { workspace } = await loadForMember(req);
  const issue = await findIssue(workspace, req.params.issueId);
  res.json({ issue: issue.toPublic() });
}

export async function updateIssue(req, res) {
  const { workspace } = await loadForMember(req);
  const issue = await findIssue(workspace, req.params.issueId);
  issue.set(req.body);
  await issue.save();
  res.json({ issue: issue.toPublic() });
}
