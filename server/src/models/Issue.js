import mongoose from 'mongoose';

// Severity levels follow axe-core's "impact" values so automated audits map straight onto them.
export const SEVERITIES = ['critical', 'serious', 'moderate', 'minor'];

// open → in_progress → fixed → verified (or reopened after a failed retest). wont_fix closes it.
export const STATUSES = ['open', 'in_progress', 'fixed', 'verified', 'reopened', 'wont_fix'];

// One accessibility problem found on a page.
const issueSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    severity: { type: String, enum: SEVERITIES, required: true },
    // WCAG success criterion, e.g. "1.1.1" (Non-text Content).
    wcag: { type: String, required: true },
    // Optional axe rule id (e.g. "image-alt") and CSS selector of the failing element.
    ruleId: { type: String, trim: true, default: '' },
    selector: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: STATUSES, default: 'open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// The issue list is always scoped to a workspace and usually filtered by status/severity.
issueSchema.index({ workspace: 1, status: 1, severity: 1 });
issueSchema.index({ workspace: 1, page: 1 });

issueSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    workspaceId: this.workspace.toString(),
    pageId: this.page.toString(),
    title: this.title,
    description: this.description,
    severity: this.severity,
    wcag: this.wcag,
    ruleId: this.ruleId,
    selector: this.selector,
    status: this.status,
    createdBy: this.createdBy.toString(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export default mongoose.model('Issue', issueSchema);
