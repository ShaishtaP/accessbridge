import dotenv from 'dotenv';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { processNextJob } from './worker.js';
import { closeBrowser } from './scanner.js';

// The worker shares the API's database settings in server/.env.
dotenv.config({ path: fileURLToPath(new URL('../../server/.env', import.meta.url)), quiet: true });

const POLL_MS = Number(process.env.WORKER_POLL_MS) || 3000;
const workerId = `${os.hostname()}-${process.pid}`;
const once = process.argv.includes('--once');
let stopping = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`[${workerId}] connected, polling every ${POLL_MS} ms${once ? ' (once)' : ''}`);

  // Drain the queue, then wait before checking again. --once exits when the queue is empty.
  while (!stopping) {
    const worked = await processNextJob(workerId);
    if (!worked) {
      if (once) break;
      await sleep(POLL_MS);
    }
  }
  await closeBrowser();
  await mongoose.disconnect();
  console.log(`[${workerId}] stopped`);
}

// Finish the current job before exiting on Ctrl+C.
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

main().catch((err) => {
  console.error('Worker crashed:', String(err.message).replace(/mongodb\+srv:\/\/\S+/g, 'mongodb+srv://…'));
  process.exit(1);
});
