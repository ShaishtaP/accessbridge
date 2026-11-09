import Site from '../models/Site.js';
import { allowedOrigins } from '../config/allowlist.js';
import { httpError } from '../utils/httpError.js';
import { loadForMember, requireManager } from '../utils/workspaceAccess.js';
import { checkOwnership } from '../utils/siteVerification.js';

// Members see the workspace's own sites plus the built-in local origins (the demo site).
export async function listSites(req, res) {
  const { workspace } = await loadForMember(req);
  const sites = await Site.find({ workspace: workspace._id }).sort({ createdAt: 1 });
  res.json({ sites: sites.map((s) => s.toPublic()), localOrigins: allowedOrigins() });
}

export async function createSite(req, res) {
  const { workspace, member } = await loadForMember(req);
  requireManager(member, 'Only owners and admins can add sites');

  const { url: origin, label } = req.body;
  if (await Site.exists({ workspace: workspace._id, origin })) {
    throw httpError(409, 'This site is already in the workspace');
  }

  const site = await Site.create({
    workspace: workspace._id,
    origin,
    label: label || new URL(origin).hostname,
    createdBy: req.user._id,
  });
  res.status(201).json({ site: site.toPublic() });
}

export async function deleteSite(req, res) {
  const { workspace, member } = await loadForMember(req);
  requireManager(member, 'Only owners and admins can remove sites');

  const site = await Site.findOneAndDelete({ _id: req.params.siteId, workspace: workspace._id });
  if (!site) throw httpError(404, 'Site not found');
  res.status(204).end();
}

// Looks for the token on the live site; only owners and admins can trigger a check.
export async function verifySite(req, res) {
  const { workspace, member } = await loadForMember(req);
  requireManager(member, 'Only owners and admins can verify sites');

  const site = await Site.findOne({ _id: req.params.siteId, workspace: workspace._id });
  if (!site) throw httpError(404, 'Site not found');
  if (site.status === 'verified') return res.json({ site: site.toPublic() });

  const result = await checkOwnership(site.origin, site.token);
  if (result.method) {
    site.status = 'verified';
    site.verifiedAt = new Date();
    site.verifiedBy = result.method;
    site.lastCheckError = '';
  } else {
    site.lastCheckError = result.reason;
  }
  await site.save();

  if (!result.method) throw httpError(422, result.reason);
  res.json({ site: site.toPublic() });
}
