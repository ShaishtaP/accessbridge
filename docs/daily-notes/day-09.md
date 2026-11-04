# Day 9 — Evidence: screenshots and keyboard-navigation notes

## Done
- Added an `Evidence` model: keyboard-navigation notes and screenshots attached to an issue, each tagged `before` (original finding) or `after` (fix check).
- Added `/api/workspaces/:id/issues/:issueId/evidence`: list, `POST /notes`, `POST /screenshots` (multipart) and `GET /:evidenceId/file`.
- Added `npm run smoke:evidence` (12 checks, including real uploads and downloads).

## How
- **Append-only:** there are no edit or delete routes, so the original finding is always preserved next to later retest evidence.
- **Membership before upload:** a `loadIssue` middleware checks workspace membership and loads the issue *before* multer runs, so non-members can't write files to disk.
- **Upload safety:** multer limits uploads to one file of at most 5 MB (`413` above that) and to PNG/JPEG/WebP types (`415` otherwise). Files get random server-side names. After upload, the first bytes are checked against the real PNG/JPEG/WebP signatures, so a renamed text file is rejected and deleted.
- **Private files:** screenshots live in the git-ignored `server/uploads/<workspaceId>/`. They are served only through an authenticated route (`sendFile` with `nosniff` and `no-store` headers), never as public static assets.
- The error handler maps `MulterError` codes to `413`/`400`.

## Result
`smoke:evidence` 12/12 passes, and `smoke:auth` 11/11, `smoke:workspaces` 15/15, `smoke:pages` 14/14 and `smoke:issues` 15/15 still pass against MongoDB Atlas.
