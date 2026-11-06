// Placeholder audit step. The Playwright + axe-core scan replaces this body;
// the queue code only depends on it returning a result object or throwing.
export async function runAudit(job) {
  return { url: job.url, violations: [], engine: 'placeholder', scannedAt: new Date().toISOString() };
}
