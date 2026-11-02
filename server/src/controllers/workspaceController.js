import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import { httpError } from '../utils/httpError.js';
import { loadForMember, requireManager } from '../utils/workspaceAccess.js';

async function sendPopulated(res, workspace, status = 200) {
  await workspace.populate('members.user', 'name email');
  res.status(status).json({ workspace: workspace.toPublic() });
}

// The creator becomes the owner and first member.
export async function createWorkspace(req, res) {
  const workspace = await Workspace.create({
    ...req.body,
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'owner' }],
  });
  await sendPopulated(res, workspace, 201);
}

// Lists only the workspaces the user is a member of, newest first.
export async function listWorkspaces(req, res) {
  const workspaces = await Workspace.find({ 'members.user': req.user._id }).sort({ createdAt: -1 });
  res.json({
    workspaces: workspaces.map((w) => ({ ...w.toPublic(), myRole: w.memberFor(req.user._id).role })),
  });
}

export async function getWorkspace(req, res) {
  const { workspace } = await loadForMember(req);
  await sendPopulated(res, workspace);
}

export async function addMember(req, res) {
  const { workspace, member } = await loadForMember(req);
  requireManager(member);

  const user = await User.findOne({ email: req.body.email });
  if (!user) throw httpError(404, 'No user with that email');
  if (workspace.memberFor(user._id)) throw httpError(409, 'User is already a member');

  workspace.members.push({ user: user._id, role: req.body.role });
  await workspace.save();
  await sendPopulated(res, workspace, 201);
}

export async function updateMember(req, res) {
  const { workspace, member } = await loadForMember(req);
  requireManager(member);

  const target = workspace.memberFor(req.params.userId);
  if (!target) throw httpError(404, 'Member not found');
  if (target.role === 'owner') throw httpError(400, "The owner's role can't be changed");

  target.role = req.body.role;
  await workspace.save();
  await sendPopulated(res, workspace);
}

// Managers can remove others; any non-owner member can remove themselves (leave).
export async function removeMember(req, res) {
  const { workspace, member } = await loadForMember(req);
  const isSelf = req.params.userId === req.user._id.toString();
  if (!isSelf) requireManager(member);

  const target = workspace.memberFor(req.params.userId);
  if (!target) throw httpError(404, 'Member not found');
  if (target.role === 'owner') throw httpError(400, "The owner can't be removed");

  workspace.members = workspace.members.filter((m) => m !== target);
  await workspace.save();
  res.status(204).end();
}
