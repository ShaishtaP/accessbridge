// Small number helpers for the metrics endpoint.

// Nearest-rank percentile: the smallest value with at least p% of the values at or below it.
export function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.max(rank - 1, 0)];
}

export function average(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Summary used for both audit durations and request latency (all in milliseconds).
export function summarize(values) {
  const round = (n) => (n === null ? null : Math.round(n * 10) / 10);
  return {
    count: values.length,
    avg: round(average(values)),
    p50: round(percentile(values, 50)),
    p95: round(percentile(values, 95)),
    max: round(values.length ? Math.max(...values) : null),
  };
}
