import mongoose from 'mongoose';

export const JOB_STATUSES = ['queued', 'running', 'done', 'failed'];

// One request to audit a page. The collection itself is the queue: the worker
// claims the oldest "queued" job atomically, so no separate broker is needed.
const auditJobSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', required: true },
    // URL snapshot, so the job still knows what to audit if the page is renamed or removed.
    url: { type: String, required: true },
    status: { type: String, enum: JOB_STATUSES, default: 'queued' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attempts: { type: Number, default: 0 },
    workerId: { type: String, default: null },
    // A running job whose lock has expired is treated as abandoned and can be claimed again.
    lockedUntil: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    error: { type: String, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Serves the worker's "oldest queued job" lookup.
auditJobSchema.index({ status: 1, createdAt: 1 });
// Serves the workspace job list.
auditJobSchema.index({ workspace: 1, createdAt: -1 });

auditJobSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    workspaceId: this.workspace.toString(),
    pageId: this.page.toString(),
    url: this.url,
    status: this.status,
    attempts: this.attempts,
    requestedBy: this.requestedBy.toString(),
    startedAt: this.startedAt,
    finishedAt: this.finishedAt,
    error: this.error,
    result: this.result,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('AuditJob', auditJobSchema);
