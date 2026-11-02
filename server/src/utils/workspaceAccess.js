import Workspace from '../models/Workspace.js';
import { httpError } from './httpError.js';

const MANAGER_ROLES = ['owner', 'admin'];

// Loads the workspace in req.params.id if the current user belongs to it.
// Non-members get 404 so they can't tell whether a workspace exists.
export async function loadForMember(req) {
  const workspace = await Workspace.findById(req.params.id);
  const member = workspace?.memberFor(req.user._id);
  if (!member) throw httpError(404, 'Workspace not found');
  return { workspace, member };
}

export function requireManager(member, message = 'Only owners and admins can manage members') {
  if (!MANAGER_ROLES.includes(member.role)) throw httpError(403, message);
}
