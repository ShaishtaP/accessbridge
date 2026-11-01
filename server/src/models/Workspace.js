import mongoose from 'mongoose';

export const ROLES = ['owner', 'admin', 'member'];

// Each member is a user plus their role inside this workspace.
const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ROLES, default: 'member' },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true }
);

// "Which workspaces is this user in?" is the most common query.
workspaceSchema.index({ 'members.user': 1 });

// Returns the member entry for a user id, or undefined.
workspaceSchema.methods.memberFor = function (userId) {
  const id = userId.toString();
  return this.members.find((m) => (m.user._id || m.user).toString() === id);
};

workspaceSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description,
    owner: (this.owner._id || this.owner).toString(),
    members: this.members.map((m) => ({
      userId: (m.user._id || m.user).toString(),
      // Populated users also carry name and email.
      ...(m.user.email ? { name: m.user.name, email: m.user.email } : {}),
      role: m.role,
    })),
    createdAt: this.createdAt,
  };
};

export default mongoose.model('Workspace', workspaceSchema);
