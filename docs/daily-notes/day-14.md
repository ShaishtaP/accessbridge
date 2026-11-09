# Day 14 — Per-workspace site list (part 1)

## Done
- `Site` model: one public origin per workspace, with a random verification token, a `pending` / `verified` status, how it was verified and when.
- `/api/workspaces/:id/sites`: members list the workspace's sites (plus the built-in local demo origins); owners and admins add and remove sites.
- `POST /api/workspaces/:id/sites/:siteId/verify`: checks the live site for the ownership token and marks it verified.

## How
- A new site is stored by origin only (`https://myapp.vercel.app`). The zod schema requires https and a real domain name, and rejects IP addresses, `localhost`-style names and embedded credentials. Local hosts stay on the server-side dev allowlist.
- Each site gets a token such as `accessbridge-<32 hex chars>`. The API response includes the exact `<meta>` tag and the well-known file URL to publish.
- Verification fetches `/.well-known/accessbridge.txt` and the home page in parallel, with a 5 second timeout, a 512 KB read limit and redirects not followed. A token on its own line in the file, or in a `<meta name="accessbridge-verification">` tag on the home page, verifies the site.
- The matching logic (`findProof`) is a pure function, separate from the network code.
