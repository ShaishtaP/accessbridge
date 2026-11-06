import { claimNextJob, completeJob, failJob } from './queue.js';
import { runAudit } from './runAudit.js';

// Claims and runs one job. Returns false when the queue is empty.
export async function processNextJob(workerId) {
  const job = await claimNextJob(workerId);
  if (!job) return false;

  console.log(`[${workerId}] job ${job._id} attempt ${job.attempts}: ${job.url}`);
  try {
    const result = await runAudit(job);
    await completeJob(job, workerId, result);
    console.log(`[${workerId}] job ${job._id} done`);
  } catch (err) {
    await failJob(job, workerId, err);
    console.log(`[${workerId}] job ${job._id} error: ${err.message}`);
  }
  return true;
}
