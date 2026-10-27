# Build Plan & Progress

One task per day. Each day: do the next unchecked task, make 3–4 meaningful commits, push, tick it off here, and write a short note in `docs/daily-notes/`.

## Tasks

### Week 1 — Foundations
- [x] **Task 0** — Project setup: folder, Git, GitHub repo, `.gitignore`, README, this plan
- [ ] **Task 1** — Express server skeleton, MongoDB Atlas connection, `/api/health` route
- [ ] **Task 2** — Demo site part 1: home + contact pages with seeded defects, `seeded-defects.json`
- [ ] **Task 3** — Demo site part 2: more pages and defects, local static server script
- [ ] **Task 4** — User model, register/login with bcrypt + JWT
- [ ] **Task 5** — Auth middleware, request validation (zod), central error handling
- [ ] **Task 6** — Workspaces: create, list, members and roles

### Week 2 — Core features
- [ ] **Task 7** — Routes (pages to audit) with allowlist validation
- [ ] **Task 8** — Issues: create/update/list, severity, WCAG rule, status, filters
- [ ] **Task 9** — Evidence: screenshot uploads (multer) and keyboard-navigation notes
- [ ] **Task 10** — Activity timeline: record every change as an ActivityEvent
- [ ] **Task 11** — Audit job queue (MongoDB collection) and worker skeleton
- [ ] **Task 12** — Worker runs Playwright + axe-core, saves AuditRuns, creates issues
- [ ] **Task 13** — Fix-verification workflow: Fixed → retest → Verified / Reopened, original evidence preserved

### Week 3 — Dashboard & results
- [ ] **Task 14** — React app setup (Vite, Tailwind, router) and login/register pages
- [ ] **Task 15** — Dashboard: workspaces, routes, issue list with filters
- [ ] **Task 16** — Issue detail page: evidence, timeline, verification actions
- [ ] **Task 17** — Metrics: recall vs seeded defects, verified fixes, audit time, API p95 latency
- [ ] **Task 18** — Final README: screenshots, architecture, results, how to run

## Daily log

| Day | Date | Task | Notes |
|---|---|---|---|
| 0 | 2026-10-27 | Task 0 | Project setup — see `docs/daily-notes/day-00.md` |
