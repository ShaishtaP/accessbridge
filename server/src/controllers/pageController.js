import Page from '../models/Page.js';
import { allowedOrigins } from '../config/allowlist.js';
import { httpError } from '../utils/httpError.js';
import { loadForMember, requireManager } from '../utils/workspaceAccess.js';

// Any member can see the pages; the allowlist is included so the UI can show what's permitted.
export async function listPages(req, res) {
  const { workspace } = await loadForMember(req);
  const pages = await Page.find({ workspace: workspace._id }).sort({ createdAt: 1 });
  res.json({ pages: pages.map((p) => p.toPublic()), allowedOrigins: allowedOrigins() });
}

export async function createPage(req, res) {
  const { workspace, member } = await loadForMember(req);
  requireManager(member, 'Only owners and admins can add pages');

  const { url, label } = req.body;
  if (await Page.exists({ workspace: workspace._id, url })) {
    throw httpError(409, 'This page is already in the workspace');
  }

  const page = await Page.create({
    workspace: workspace._id,
    url,
    label: label || new URL(url).pathname,
    createdBy: req.user._id,
  });
  res.status(201).json({ page: page.toPublic() });
}

export async function deletePage(req, res) {
  const { workspace, member } = await loadForMember(req);
  requireManager(member, 'Only owners and admins can remove pages');

  // Scoped to the workspace so a page id from another workspace can't be deleted here.
  const page = await Page.findOneAndDelete({ _id: req.params.pageId, workspace: workspace._id });
  if (!page) throw httpError(404, 'Page not found');
  res.status(204).end();
}
