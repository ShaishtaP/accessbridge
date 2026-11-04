import mongoose from 'mongoose';

export const EVIDENCE_KINDS = ['screenshot', 'keyboard_note'];
// "before" documents the original finding; "after" documents the fix being checked.
export const PHASES = ['before', 'after'];

const fileSchema = new mongoose.Schema(
  {
    storedName: { type: String, required: true },
    originalName: { type: String, default: '' },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

// Proof attached to an issue. Evidence is append-only (no edit or delete routes),
// so the original finding is always preserved next to any later retest evidence.
const evidenceSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
    kind: { type: String, enum: EVIDENCE_KINDS, required: true },
    phase: { type: String, enum: PHASES, default: 'before' },
    // Keyboard-navigation steps, or a caption for a screenshot.
    note: { type: String, trim: true, maxlength: 4000, default: '' },
    file: { type: fileSchema, default: undefined },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

evidenceSchema.index({ issue: 1, createdAt: 1 });

evidenceSchema.methods.toPublic = function () {
  const base = `/api/workspaces/${this.workspace}/issues/${this.issue}/evidence/${this._id}`;
  return {
    id: this._id.toString(),
    issueId: this.issue.toString(),
    kind: this.kind,
    phase: this.phase,
    note: this.note,
    file: this.file
      ? { originalName: this.file.originalName, mimeType: this.file.mimeType, size: this.file.size, url: `${base}/file` }
      : null,
    createdBy: this.createdBy.toString(),
    createdAt: this.createdAt,
  };
};

export default mongoose.model('Evidence', evidenceSchema);
