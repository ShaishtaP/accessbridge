# Build Plan & Progress

Roadmap for AccessBridge, built in small, shippable increments. Each completed task has a dev log entry in `docs/daily-notes/`.

## Tasks

### Week 1 — Foundations
- [x] **Task 0** — Project setup: folder, Git, GitHub repo, `.gitignore`, README, this plan
- [x] **Task 1** — Express server skeleton, MongoDB Atlas connection, `/api/health` route
- [x] **Task 2** — Demo site part 1: home + contact pages with seeded defects, `seeded-defects.json`
- [x] **Task 3** — Demo site part 2: more pages and defects, local static server script
- [x] **Task 4** — User model, register/login with bcrypt + JWT
- [x] **Task 5** — Auth middleware, request validation (zod), central error handling
- [x] **Task 6** — Workspaces: create, list, members and roles

### Week 2 — Core features
- [x] **Task 7** — Routes (pages to audit) with allowlist validation
- [x] **Task 8** — Issues: create/update/list, severity, WCAG rule, status, filters
- [x] **Task 9** — Evidence: screenshot uploads (multer) and keyboard-navigation notes
- [x] **Task 10** — Activity timeline: record every change as an ActivityEvent
- [x] **Task 11** — Audit job queue (MongoDB collection) and worker skeleton
- [x] **Task 12** — Worker runs Playwright + axe-core, saves AuditRuns, creates issues
- [x] **Task 13** — Fix-verification workflow: Fixed → retest → Verified / Reopened, original evidence preserved
- [x] **Task 14** — Per-workspace site list: owners register their own deployed sites (e.g. `https://myapp.vercel.app`) alongside the local demo; ownership verification via a meta tag or `/.well-known/accessbridge.txt` token before a site can be audited
- [x] **Task 15** — SSRF guard for public sites: resolve DNS and block private/loopback/link-local IPs (localhost only via the dev allowlist), re-check every redirect, page timeouts; audit a real deployed site end to end

### Week 3 — Dashboard & results
- [x] **Task 16** — React app setup (Vite, Tailwind, router) and login/register pages
- [x] **Task 17** — Dashboard: workspaces, routes, issue list with filters
- [x] **Task 18** — Issue detail page: evidence, timeline, verification actions
- [ ] **Task 19** — Metrics: recall vs seeded defects, verified fixes, audit time, API p95 latency

### Week 4 — DevOps & launch
- [ ] **Task 20** — Docker: Dockerfiles for server, worker (Playwright base image), client (static build served by Nginx) and demo site; `docker-compose.yml` that runs the whole stack with health checks, using `.env` for secrets; small, cached image layers and non-root users
- [ ] **Task 21** — CI with GitHub Actions: on every push and pull request, install dependencies, run all smoke suites against a MongoDB service container, run the Playwright audit smoke test, build the client and the Docker images; status badge
- [ ] **Task 22** — Free deployment: React client on a free static host, API on a free web-service tier with `/api/health` checks, CORS and production env vars; the worker runs as a Docker container (free hosts lack the RAM for Chromium); deployment steps documented
- [ ] **Task 23** — Final README: screenshots, architecture, results, CI badge, live links, how to run

## Daily log

| Day | Date | Task | Notes |
|---|---|---|---|
| 0 | 2026-10-27 | Task 0 | Project setup — see `docs/daily-notes/day-00.md` |
| 1 | 2026-10-28 | Task 1 | Express server + Atlas connection, `/api/health` returns `db: connected` — see `docs/daily-notes/day-01.md` |
| 2 | 2026-10-29 | Task 2 | Demo site (home + contact) with 16 seeded defects and `seeded-defects.json` — see `docs/daily-notes/day-02.md` |
| 3 | 2026-10-30 | Task 3 | Menu + About pages (27 seeded defects total) and a zero-dependency static server — see `docs/daily-notes/day-03.md` |
| 4 | 2026-10-31 | Task 4 | User model with bcrypt hashing, `/api/auth/register` + `/api/auth/login` issuing JWTs, auth smoke check — see `docs/daily-notes/day-04.md` |
| 5 | 2026-10-31 | Task 5 | zod request validation, `requireAuth` + `GET /api/auth/me`, central handling for JSON/cast/duplicate errors — see `docs/daily-notes/day-05.md` |
| 6 | 2026-11-01 | Task 6 | Workspace model with owner/admin/member roles, `/api/workspaces` create/list/get and member add/role/remove routes, 15 workspace smoke checks — see `docs/daily-notes/day-06.md` |
| 7 | 2026-11-02 | Task 7 | Page model, `/api/workspaces/:id/pages` list/add/delete with audit URL allowlist (SSRF-safe), 14 page smoke checks — see `docs/daily-notes/day-07.md` |
| 8 | 2026-11-03 | Task 8 | Issue model (severity, WCAG criterion, status), `/api/workspaces/:id/issues` create/list/get/update with status, severity, page and WCAG filters, 15 issue smoke checks — see `docs/daily-notes/day-08.md` |
| 9 | 2026-11-04 | Task 9 | Append-only evidence: keyboard notes and screenshot uploads (multer, 5 MB, magic-byte check, member-only downloads), 12 evidence smoke checks — see `docs/daily-notes/day-09.md` |
| 10 | 2026-11-05 | Task 10 | ActivityEvent timeline: issue creation, field-level updates and evidence recorded automatically, issue timeline + workspace feed routes, 9 activity smoke checks — see `docs/daily-notes/day-10.md` |
| 11 | 2026-11-06 | Task 11 | AuditJob collection as the job queue, `/api/workspaces/:id/audits` queue/list/get routes, worker skeleton with atomic job claiming, lock expiry and retries, 11 audit smoke checks — see `docs/daily-notes/day-11.md` |
| 12 | 2026-11-07 | Task 12 | Worker runs Playwright + axe-core 4.14 (allowlist enforced in worker and per request), AuditRuns stored, deduplicated issues created; recall 19/20 automatable seeded defects (95%) — see `docs/daily-notes/day-12.md` |
| 13 | 2026-11-08 | Task 13 | Fix verification: `POST /issues/:issueId/retest` queues a retest job for a fixed issue, the worker re-scans the page and sets it to verified or reopened on the same issue (evidence and timeline kept), 13 retest smoke checks — see `docs/daily-notes/day-13.md` |
| 14 | 2026-11-09 | Task 14 (partial) | Site model with per-site verification tokens, `/api/workspaces/:id/sites` list/add/delete (https domains only), `POST /sites/:siteId/verify` checks a meta tag or `/.well-known/accessbridge.txt` — see `docs/daily-notes/day-14.md` |
| 15 | 2026-11-10 | Task 14 | Pages accepted on verified workspace sites (dev allowlist + verified origins), meta-tag proof matching hardened, 22 site smoke checks — see `docs/daily-notes/day-15.md` |
| 16 | 2026-11-11 | Task 15 | SSRF guard: DNS resolution with private/loopback/link-local/reserved IPv4 + IPv6 blocking, every request and redirect hop re-checked, service workers blocked, navigation/action/scan timeouts, guard applied to ownership checks; public site (example.com) audited through the guarded scanner, 24 net guard checks — see `docs/daily-notes/day-16.md` |
| 17 | 2026-11-12 | Task 16 | React client (Vite, Tailwind 4, React Router) with `/api` dev proxy, auth context backed by `/api/auth/me`, protected routes, accessible login and register pages — see `docs/daily-notes/day-17.md` |
| 18 | 2026-11-12 | Task 17 | Dashboard: workspace list and create form, workspace page with members, pages (owner/admin add/remove, allowed origins) and per-page audit runs with live job status, issue list with status/severity/page/WCAG filters kept in the URL — see `docs/daily-notes/day-18.md` |
| 19 | 2026-11-13 | Task 18 | Issue detail page: rule and element details, status changes, retest request with live job polling (verified/reopened result), append-only evidence with keyboard notes and authenticated screenshot uploads/previews, activity timeline with field-level changes — see `docs/daily-notes/day-19.md` |
