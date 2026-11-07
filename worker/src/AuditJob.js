import mongoose from 'mongoose';

// Worker-side view of the server's "auditjobs" collection. Only the fields the
// worker reads or writes are declared; strict: false keeps the rest untouched.
const auditJobSchema = new mongoose.Schema(
  {
    workspace: mongoose.Schema.Types.ObjectId,
    page: mongoose.Schema.Types.ObjectId,
    requestedBy: mongoose.Schema.Types.ObjectId,
    url: String,
    status: String,
    attempts: Number,
    workerId: String,
    lockedUntil: Date,
    startedAt: Date,
    finishedAt: Date,
    error: String,
    result: mongoose.Schema.Types.Mixed,
  },
  { collection: 'auditjobs', strict: false, timestamps: true }
);

export default mongoose.model('AuditJob', auditJobSchema);
