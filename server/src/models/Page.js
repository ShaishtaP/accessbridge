import mongoose from 'mongoose';

// A page (URL) inside a workspace that can be audited for accessibility issues.
const pageSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    url: { type: String, required: true },
    label: { type: String, trim: true, maxlength: 80, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// The same URL can only be added once per workspace; this index also serves "list pages".
pageSchema.index({ workspace: 1, url: 1 }, { unique: true });

pageSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    workspaceId: this.workspace.toString(),
    url: this.url,
    path: new URL(this.url).pathname,
    label: this.label,
    createdBy: this.createdBy.toString(),
    createdAt: this.createdAt,
  };
};

export default mongoose.model('Page', pageSchema);
