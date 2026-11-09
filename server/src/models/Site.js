import mongoose from 'mongoose';
import crypto from 'node:crypto';

// A public site (one origin) that a workspace wants to audit. It stays "pending"
// until the owner proves control of it by publishing the verification token.
const siteSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    origin: { type: String, required: true },
    label: { type: String, trim: true, maxlength: 80, default: '' },
    token: {
      type: String,
      required: true,
      default: () => `accessbridge-${crypto.randomBytes(16).toString('hex')}`,
    },
    status: { type: String, enum: ['pending', 'verified'], default: 'pending' },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: String, enum: ['meta', 'file', null], default: null },
    lastCheckError: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// One entry per origin per workspace; this index also serves "list sites".
siteSchema.index({ workspace: 1, origin: 1 }, { unique: true });

siteSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    workspaceId: this.workspace.toString(),
    origin: this.origin,
    label: this.label,
    status: this.status,
    verifiedAt: this.verifiedAt,
    verifiedBy: this.verifiedBy,
    lastCheckError: this.lastCheckError,
    // Everything the owner needs to publish one of the two proofs.
    verification: {
      token: this.token,
      metaTag: `<meta name="accessbridge-verification" content="${this.token}">`,
      fileUrl: `${this.origin}/.well-known/accessbridge.txt`,
    },
    createdAt: this.createdAt,
  };
};

export default mongoose.model('Site', siteSchema);
