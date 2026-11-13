# Day 20 — Metrics: recall, verified fixes, audit time, API p95 latency

## Done
- `GET /api/workspaces/:id/metrics` (members only) returning issue counts by status and severity, fix verification counts, audit timings, recall against the seeded demo defects and API latency.
- In-memory request latency tracker on every `/api` request: a ring buffer of the last 1,000 durations, reported as count, average, p50, p95 and max.
- `src/utils/stats.js` with nearest-rank `percentile`, `average` and a shared `summarize` helper.
- Metrics page in the client at `/workspaces/:id/metrics`, linked from the workspace page: four headline tiles (recall, verified fixes, audit scan p95, API p95), issue breakdown tables, a timings table and the list of seeded defects not found yet.
- `npm run smoke:metrics`: 13 checks.

## How
- **Recall** reads `demo-site/seeded-defects.json` and only counts defects whose demo page (matched by path on a dev-allowlisted origin, `/` = `index.html`) is in the workspace. A defect counts as found when an issue on that page carries its expected axe rule, whatever the issue's status, so fixing an issue does not lower recall. Defects without an axe rule are reported in the total but excluded from the rate (they need manual testing).
- **Verified fixes** come from issue statuses: `verified`, plus `fixed` (awaiting retest) and `reopened`; retest jobs are counted separately.
- **Audit time** has two measures over finished, non-retest jobs: scan time (`result.durationMs` from the worker) and total time from queueing to finish (`finishedAt − createdAt`), which includes queue wait.
- **API latency** is measured with `process.hrtime.bigint()` from the start of the request to the response's `finish` event. Samples live in memory, so they reset when the server restarts and cost no database writes.
- The metrics page uses a description list for the tiles, tables with captions and `scope` headers for breakdowns, `tabular-nums` for aligned numbers, and a `role="status"` line showing when the data was last refreshed.

## Result
- All 4 demo pages audited end to end through the dev proxy with the worker running:
  - **Recall:** 19 of 20 automatable seeded defects found (95%); 27 seeded in total. The one miss is A-02 (`aria-valid-attr-value`).
  - **Audit scan time:** p50 494 ms, p95 666 ms. Total time including queue wait: p50 5.4 s, p95 7.8 s.
  - **API latency:** p95 184.7 ms over 215 requests (local server, MongoDB Atlas in Mumbai).
- `npm run smoke:metrics`: 13/13 pass. `npm run build` in `client/` succeeds.
