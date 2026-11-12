# Day 18 — Dashboard: workspaces, pages, audits and issues

## Done
- Workspace list as the dashboard home: each workspace with its description, member count and the signed-in user's role, plus a form to create a new workspace.
- Workspace page: pages-to-audit table, add/remove page controls for owners and admins, the allowed audit origins shown under the URL field, and the member list with roles.
- "Run audit" button per page that queues `POST /api/workspaces/:id/audits` and shows the latest job state (queued, running, done, failed) with a short result summary.
- Issue list with status, severity, page and WCAG filters, backed by the `/api/workspaces/:id/issues` query filters.
- Issue summary route at `/workspaces/:id/issues/:issueId`, linked from every row.

## How
- Routes: `/` (workspaces), `/workspaces/:id`, `/workspaces/:id/issues` and `/workspaces/:id/issues/:issueId`, all behind `RequireAuth`.
- The latest job per page comes from `GET /audits` (newest first). While any job is queued or running, the page refreshes job states every 3 seconds and stops once all of them finish.
- Owner/admin controls are shown from the user's role in the workspace; the API enforces the same rule.
- Issue filters are stored in the URL query string with `useSearchParams`, so a filtered view can be bookmarked and the browser back button restores earlier filters.
- `api()` handles `204 No Content` and surfaces the first validation detail from the server (for example, an invalid WCAG criterion).
- Accessibility: every field has a `<label>`, tables have captions and `scope` headers, each page sets `document.title`, breadcrumbs sit in a labelled `<nav>`, and changes such as "Audit queued" are announced through a `role="status"` region. Status and severity badges carry text, not just colour.

## Result
- `npm run build` succeeds. Against the running API through the dev proxy: workspace create/list/get, page add (allowlisted) and rejection (non-allowlisted), audit queueing with a 409 for a duplicate run, issue filters (match, no match, invalid WCAG) and page removal all return the expected responses.
