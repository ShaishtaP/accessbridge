# Day 10 — Activity timeline

## Done
- `ActivityEvent` model: workspace, issue, actor, action (`issue.created`, `issue.updated`, `evidence.added`), field-level `changes` and small `meta`.
- Events recorded automatically when an issue is created, when an issue is updated, and when a keyboard note or screenshot is added as evidence.
- `GET /api/workspaces/:id/issues/:issueId/activity` — full issue timeline, oldest first.
- `GET /api/workspaces/:id/activity?limit=N` — recent workspace feed, newest first (1–100, default 50).
- `npm run smoke:activity` with 9 checks against the real database; the issue and evidence smoke scripts also clean up their events.

## How
- `utils/activity.js` holds `recordActivity()` and `diffIssue()`. The update handler snapshots the issue before applying the PATCH, compares tracked fields afterwards and stores only real changes as `{ field, from, to }`. A PATCH that resends the same values adds no event.
- Events have no API for creating, editing or deleting them; they only appear as side effects of other actions, which keeps the history trustworthy.
- Two indexes match the two read paths: `{ issue, createdAt }` for the issue timeline and `{ workspace, createdAt: -1 }` for the feed.
- Both routes reuse `loadForMember()`, so non-members get a 404 just like the other workspace routes.

## Result
All 9 activity checks pass, along with the existing issue (15) and evidence (12) checks.
