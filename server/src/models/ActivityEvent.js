import mongoose from 'mongoose';

export const ACTIVITY_ACTIONS = ['issue.created', 'issue.updated', 'evidence.added', 'issue.retest_requested', 'issue.retested'];

// One entry in an issue's timeline. Events are written by the server only and never edited,
// so the timeline is a trustworthy record of who changed what and when.
const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    from: { type: mongoose.Schema.Types.Mixed, default: null },
    to: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const activityEventSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true },
    // Field-level before/after values for "issue.updated".
    changes: { type: [changeSchema], default: [] },
    // Small extra context, e.g. the evidence id and kind for "evidence.added".
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Timelines are read per issue (oldest first) and per workspace (newest first).
activityEventSchema.index({ issue: 1, createdAt: 1 });
activityEventSchema.index({ workspace: 1, createdAt: -1 });

activityEventSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    workspaceId: this.workspace.toString(),
    issueId: this.issue.toString(),
    actor: this.actor.toString(),
    action: this.action,
    changes: this.changes.map(({ field, from, to }) => ({ field, from, to })),
    meta: this.meta,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('ActivityEvent', activityEventSchema);
