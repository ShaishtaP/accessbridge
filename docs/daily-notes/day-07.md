# Day 7 — Audit pages with allowlist validation

## Done
- Added a `Page` model: a URL inside a workspace that can be audited, with a label and creator.
- Added `/api/workspaces/:id/pages`: list (any member), add and delete (owners and admins).
- Added an audit allowlist (`AUDIT_ALLOWLIST`, default `http://localhost:4000` and `http://127.0.0.1:4000`) that every page URL must match.
- Moved the workspace membership checks into `utils/workspaceAccess.js` so workspace and page routes share them.
- Added `npm run smoke:pages` (14 checks).

## How
- `checkAuditUrl()` parses the URL, accepts only `http`/`https`, rejects embedded credentials, requires the origin to be on the allowlist and strips the `#fragment`. The zod schema runs it as a transform, so controllers receive a normalised URL or the client gets `400` with a `url` field detail.
- The allowlist keeps the future audit worker from being pointed at arbitrary or internal hosts (SSRF protection).
- A unique index on `{ workspace, url }` prevents duplicates (`409`). Deletes are scoped to the workspace, so a page id from another workspace returns `404`.
- The pages router uses `mergeParams` and is mounted inside the workspaces router, so it inherits `requireAuth`.

## Result
`smoke:pages` 14/14, `smoke:workspaces` 15/15 and `smoke:auth` 11/11 pass against MongoDB Atlas.
