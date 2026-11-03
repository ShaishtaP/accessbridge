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
- [ ] **Task 9** — Evidence: screenshot uploads (multer) and keyboard-navigation notes
- [ ] **Task 10** — Activity timeline: record every change as an ActivityEvent
- [ ] **Task 11** — Audit job queue (MongoDB collection) and worker skeleton
- [ ] **Task 12** — Worker runs Playwright + axe-core, saves AuditRuns, creates issues
- [ ] **Task 13** — Fix-verification workflow: Fixed → retest → Verified / Reopened, original evidence preserved
- [ ] **Task 14** — Per-workspace site list: owners register their own deployed sites (e.g. `https://myapp.vercel.app`) alongside the local demo; ownership verification via a meta tag or `/.well-known/accessbridge.txt` token before a site can be audited
- [ ] **Task 15** — SSRF guard for public sites: resolve DNS and block private/loopback/link-local IPs (localhost only via the dev allowlist), re-check every redirect, page timeouts; audit a real deployed site end to end

### Week 3 — Dashboard & results
- [ ] **Task 16** — React app setup (Vite, Tailwind, router) and login/register pages
- [ ] **Task 17** — Dashboard: workspaces, routes, issue list with filters
- [ ] **Task 18** — Issue detail page: evidence, timeline, verification actions
- [ ] **Task 19** — Metrics: recall vs seeded defects, verified fixes, audit time, API p95 latency
- [ ] **Task 20** — Final README: screenshots, architecture, results, how to run

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
