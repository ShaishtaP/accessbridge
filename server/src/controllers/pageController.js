import Page from '../models/Page.js';
import Site from '../models/Site.js';
import { allowedOrigins, isAllowedOrigin } from '../config/allowlist.js';
import { httpError } from '../utils/httpError.js';
import { loadForMember, requireManager } from '../utils/workspaceAccess.js';

// Origins of the workspace's sites that passed the ownership check.
async function verifiedSiteOrigins(workspaceId) {
  const sites = await Site.find({ workspace: workspaceId, status: 'verified' }).select('origin');
  return sites.map((s) => s.origin);
}

// Any member can see the pages; the permitted origins are included so the UI can show them.
export async function listPages(req, res) {
  const { workspace } = await loadForMember(req);
  const pages = await Page.find({ workspace: workspace._id }).sort({ createdAt: 1 });
  const siteOrigins = await verifiedSiteOrigins(workspace._id);
  res.json({ pages: pages.map((p) => p.toPublic()), allowedOrigins: [...allowedOrigins(), ...siteOrigins] });
}

export async function createPage(req, res) {
  const { workspace, member } = await loadForMember(req);
  requireManager(member, 'Only owners and admins can add pages');

  const { url, label } = req.body;
  // A page must belong to the dev allowlist or to a site this workspace has proven it owns.
  const { origin } = new URL(url);
  if (!isAllowedOrigin(origin, await verifiedSiteOrigins(workspace._id))) {
    throw httpError(400, 'Validation failed', [
      { field: 'url', message: `${origin} is not on the audit allowlist or a verified site of this workspace` },
    ]);
  }
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
