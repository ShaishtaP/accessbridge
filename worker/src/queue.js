import AuditJob from './AuditJob.js';

export const LOCK_MS = 5 * 60 * 1000; // a job running longer than this is considered abandoned
export const MAX_ATTEMPTS = 3;

// Atomically moves the oldest available job to "running" and returns it (or null).
// findOneAndUpdate is a single database operation, so two workers can never claim the same job.
export async function claimNextJob(workerId) {
  const now = new Date();
  return AuditJob.findOneAndUpdate(
    {
      attempts: { $lt: MAX_ATTEMPTS },
      $or: [{ status: 'queued' }, { status: 'running', lockedUntil: { $lt: now } }],
    },
    {
      $set: { status: 'running', workerId, startedAt: now, lockedUntil: new Date(now.getTime() + LOCK_MS) },
      $inc: { attempts: 1 },
    },
    { sort: { createdAt: 1 }, returnDocument: 'after' }
  );
}

// Updates are scoped to this worker, so a worker whose lock expired can't overwrite a newer claim.
export async function completeJob(job, workerId, result) {
  return AuditJob.updateOne(
    { _id: job._id, workerId },
    { $set: { status: 'done', result, error: null, finishedAt: new Date(), lockedUntil: null } }
  );
}

export async function failJob(job, workerId, err) {
  // Out of attempts: mark failed for good; otherwise put it back in the queue for a retry.
  const finalAttempt = job.attempts >= MAX_ATTEMPTS;
  return AuditJob.updateOne(
    { _id: job._id, workerId },
    {
      $set: {
        status: finalAttempt ? 'failed' : 'queued',
        error: String(err?.message || err).slice(0, 500),
        finishedAt: finalAttempt ? new Date() : null,
        lockedUntil: null,
      },
    }
  );
}
