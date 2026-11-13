import { summarize } from '../utils/stats.js';

// Keeps the duration of the most recent API requests in memory (a fixed-size ring buffer),
// so p95 latency can be reported without a database write on every request.
const MAX_SAMPLES = 1000;
const samples = [];
let cursor = 0;

export function trackLatency(req, res, next) {
  const start = process.hrtime.bigint();
  // "finish" fires once the response has been handed to the network.
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    if (samples.length < MAX_SAMPLES) samples.push(ms);
    else samples[cursor] = ms;
    cursor = (cursor + 1) % MAX_SAMPLES;
  });
  next();
}

export function latencyStats() {
  return { ...summarize(samples), window: MAX_SAMPLES };
}
