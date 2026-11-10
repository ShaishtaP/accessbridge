# Day 15 — Verified sites unlock real pages

## Done
- Pages can now belong to a workspace's **verified** sites (for example `https://myapp.vercel.app/about`) as well as the local demo origins.
- The page list returns every origin the workspace may audit: the dev allowlist plus its verified sites.
- Ownership meta tags are matched even with spaces around `=`.
- Added `npm run smoke:sites` (22 checks).
- This completes Task 14: register sites, prove ownership, then audit their pages.

## How
- URL handling is split into `parseAuditUrl()` (scheme, credentials, fragment) and `isAllowedOrigin(origin, extraOrigins)`. The zod schema checks the shape; the controller checks the origin against the dev allowlist plus `Site.find({ workspace, status: 'verified' })`.
- Pending sites unlock nothing. Deleting a site immediately blocks new pages on its origin.
- Sites must be `https` domain names. IP addresses, `.local`/`.localhost` hosts and URLs with credentials are rejected at registration.
- Ownership proof is either `<meta name="accessbridge-verification" content="TOKEN">` on the home page or the token in `/.well-known/accessbridge.txt`. Both are fetched with a 5 s timeout, a 512 KB cap and no redirect following.

## Result
- `smoke:sites` 22/22, `smoke:pages` 14/14, `smoke:audits` 12/12 and `smoke:retest` 13/13 pass.
- Worker smoke 7/7, with recall unchanged at 19/20 automatable seeded defects.
