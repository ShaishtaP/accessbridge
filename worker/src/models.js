import mongoose from 'mongoose';

// Worker-side views of collections the API owns. The worker has its own mongoose instance,
// so it declares the fields it writes here instead of importing the server's models.
const { ObjectId, Mixed } = mongoose.Schema.Types;

const issueSchema = new mongoose.Schema(
  {
    workspace: ObjectId,
    page: ObjectId,
    title: String,
    description: { type: String, default: '' },
    severity: String,
    wcag: String,
    ruleId: { type: String, default: '' },
    selector: { type: String, default: '' },
    status: { type: String, default: 'open' },
    createdBy: ObjectId,
  },
  { collection: 'issues', strict: false, timestamps: true }
);

const activityEventSchema = new mongoose.Schema(
  {
    workspace: ObjectId,
    issue: ObjectId,
    actor: ObjectId,
    action: String,
    changes: { type: Array, default: [] },
    meta: { type: Mixed, default: {} },
  },
  { collection: 'activityevents', strict: false, timestamps: { createdAt: true, updatedAt: false } }
);

// One completed scan of one page: the raw evidence that issues and later retests point back to.
const auditRunSchema = new mongoose.Schema(
  {
    workspace: { type: ObjectId, required: true },
    page: { type: ObjectId, required: true },
    job: { type: ObjectId, required: true },
    url: { type: String, required: true },
    engine: { name: String, version: String },
    durationMs: Number,
    violationCount: Number,
    nodeCount: Number,
    violations: { type: Array, default: [] },
    incompleteRuleIds: { type: [String], default: [] },
    issuesCreated: { type: [ObjectId], default: [] },
    issuesExisting: { type: [ObjectId], default: [] },
    // Filled only for retest runs: which issue was checked and the outcome.
    retest: { type: Mixed, default: null },
  },
  { collection: 'auditruns', timestamps: { createdAt: true, updatedAt: false } }
);
auditRunSchema.index({ workspace: 1, page: 1, createdAt: -1 });

export const Issue = mongoose.model('Issue', issueSchema);
export const ActivityEvent = mongoose.model('ActivityEvent', activityEventSchema);
export const AuditRun = mongoose.model('AuditRun', auditRunSchema);

// Read-only view of workspace sites: the worker only needs verified origins.
const siteSchema = new mongoose.Schema(
  { workspace: ObjectId, origin: String, status: String },
  { collection: 'sites' }
);
export const Site = mongoose.model('Site', siteSchema);
