# Day 13 — Fix verification workflow

## Done
- `POST /api/workspaces/:id/issues/:issueId/retest` queues a retest for an issue marked `fixed`.
- Audit jobs carry an optional `retestIssue`, exposed as `retestIssueId` in the API.
- The worker re-scans the page on a retest job and moves the issue to `verified` or `reopened`.
- New timeline actions: `issue.retest_requested` and `issue.retested` (with the status change and the AuditRun id).
- `npm run smoke:retest`: 13 checks against the real database and the demo site.

## How
- Only `fixed` issues with an axe rule id and selector can be retested; other statuses get 409, manual issues without a rule get 400. The one-pending-audit-per-page rule also applies to retests.
- After the scan, the worker looks for the same rule on the same selector. Still present → `reopened`; gone → `verified`. The outcome is stored on the AuditRun (`retest`) and in the job result.
- The issue keeps its id through the whole cycle, so screenshots, keyboard notes and earlier timeline events stay attached. A reopened issue is matched by the normal deduplication, so the retest scan does not create a duplicate.
- If the issue changed status while the job was queued, the retest is recorded as `skipped` and the issue is left alone.
- `verified` and `reopened` cannot be set through `PATCH`; only the retest sets them.

## Result
- 13/13 retest smoke checks pass: a still-failing demo defect is reopened, a finding whose element no longer fails is verified.
