# Day 23 — Sites and members management in the client

## Done
- **Sites panel** on the workspace page: lists the workspace's deployed sites with a pending/verified badge, shows both ownership proofs for pending sites (the `<meta name="accessbridge-verification">` tag and the `/.well-known/accessbridge.txt` file with its token), a "Check verification" button, the last check result, and an add-site form for owners and admins.
- **Members panel**: add a registered user by email with a role, change a member's role between admin and member, remove members, and "Leave workspace" for non-owners.
- CI: the audit and retest smoke suites start the real worker, so they now run in the Playwright job where Chromium is installed. Actions updated to `checkout@v5` and `setup-node@v5`.

## How
- Both panels are separate components (`SitesSection`, `MembersSection`) that receive the workspace, the user's permission and a shared `announce` function, so every change is read out through the page's single `role="status"` region.
- Verifying or removing a site re-fetches the allowed origins, so the page form's hint updates immediately to include the newly verified domain.
- Member changes use the workspace returned by the API (`POST`/`PATCH /members`), so the list always matches the server's state.
- Owner and self rows are not editable; the server enforces the same rules (one owner, managers only).
- Role selects carry a visually hidden label ("Role for Name") and row buttons name the member or site they act on.

## Result
- Checked against the running API: add member (201), unknown email (404), role change to admin (200), add site (201, pending, with meta tag), verification without a published token (422 with the reason), remove site (204), member leaves (204).
- `npm run build` succeeds; CI run on `main`: all 7 jobs pass (server suites, Playwright audit, client build, 4 Docker images).
