import ActivityEvent from '../models/ActivityEvent.js';
import { findIssue } from './issueController.js';
import { loadForMember } from '../utils/workspaceAccess.js';

// Read-only on purpose: events are created by the server as side effects, never through the API.

// Full history of one issue, oldest first, so it reads like a story from report to fix.
export async function issueActivity(req, res) {
  const { workspace } = await loadForMember(req);
  const issue = await findIssue(workspace, req.params.issueId);
  const events = await ActivityEvent.find({ issue: issue._id }).sort({ createdAt: 1, _id: 1 });
  res.json({ activity: events.map((e) => e.toPublic()) });
}

// Recent activity across the whole workspace, newest first. ?limit=1..100 (default 50).
export async function workspaceActivity(req, res) {
  const { workspace } = await loadForMember(req);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const events = await ActivityEvent.find({ workspace: workspace._id }).sort({ createdAt: -1, _id: -1 }).limit(limit);
  res.json({ activity: events.map((e) => e.toPublic()) });
}
