# Day 22 — CI with GitHub Actions

## Done
- `.github/workflows/ci.yml` runs on every push to `main` and on every pull request.
- **Server job**: installs dependencies, runs the no-database health check, then all eleven database smoke suites (auth, workspaces, pages, issues, evidence, activity, audits, retest, sites, netguard, metrics) against a MongoDB 8 service container.
- **Worker job**: installs Chromium for Playwright and runs the end-to-end audit smoke test, which serves the demo site, audits all four pages and checks recall against `seeded-defects.json`.
- **Client job**: production Vite build.
- **Docker job**: builds the server, worker, client and demo-site images in a matrix, with the same build context as `docker-compose.yml`.
- CI status badge at the top of the README.

## How
- The workflow sets `MONGODB_URI` (pointing at the service container) and a CI-only `JWT_SECRET` as environment variables. dotenv never overrides existing variables and `server/.env` is absent on the runner, so the smoke scripts pick these up unchanged.
- The MongoDB service has a `mongosh` ping health check, so jobs only start once the database accepts connections.
- npm downloads are cached per package through `actions/setup-node`, and Docker layers through the GitHub Actions cache (`type=gha`, one scope per image).
- Jobs run in parallel; `concurrency` cancels an older run on the same branch when a newer commit arrives. The workflow token is read-only.
