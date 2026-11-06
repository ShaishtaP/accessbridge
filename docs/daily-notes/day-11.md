# Day 11 — Audit job queue and worker skeleton

## Done
- `AuditJob` model: workspace, page, URL snapshot, status (`queued` / `running` / `done` / `failed`), attempts, worker id, lock expiry, timing, error and result.
- Routes under `/api/workspaces/:id/audits`: queue an audit for a page (`POST`), list recent jobs with an optional `status` filter (`GET`), and get one job (`GET /:jobId`).
- One pending audit per page: a second request while a job is queued or running returns 409.
- New `worker/` package: polls the queue, claims a job, runs the audit step and records the outcome. A `--once` mode drains the queue and exits.
- `npm run smoke:audits` with 11 checks, including a real worker run.

## How
- The MongoDB collection is the queue. The worker claims the oldest available job with a single `findOneAndUpdate`, which sets it to `running`, stamps the worker id, increments `attempts` and sets `lockedUntil` five minutes ahead. Because the claim is one atomic operation, two workers can never take the same job.
- A `running` job whose lock has expired counts as abandoned and can be claimed again, so a crashed worker doesn't leave jobs stuck.
- Completion and failure updates are filtered by worker id. A failed job goes back to `queued` until it reaches 3 attempts, then it is marked `failed` with the error message.
- The job stores a copy of the page URL, so it still knows what to audit if the page changes.
- The audit step (`worker/src/runAudit.js`) currently returns an empty placeholder result; the Playwright + axe-core scan plugs in there next. The worker reads the database settings from `server/.env` and stops cleanly after the current job on Ctrl+C.

## Result
All 11 audit smoke checks pass: queue, duplicate guard, validation, member-only access, list, worker run to `done`, and re-queue after completion.
