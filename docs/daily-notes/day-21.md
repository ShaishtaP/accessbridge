# Day 21 — Docker

## Done
- `server/Dockerfile`: Node 22 Alpine image for the API with production-only dependencies, a health check on `/api/health` and a non-root `node` user.
- `worker/Dockerfile`: built on the official Playwright image (v1.65.0, matching the `playwright` package) so Chromium and its system libraries are included; runs as `pwuser`.
- `client/Dockerfile`: two-stage build — Vite builds the React app, then unprivileged Nginx serves `dist/` on port 8080.
- `client/nginx.conf`: `/api/` proxied to the server container, long-lived caching for hashed assets, SPA fallback to `index.html`.
- `demo-site/Dockerfile`: the zero-dependency demo server; `server.js` now reads `DEMO_HOST` (default `127.0.0.1`), set to `0.0.0.0` in the image.
- `docker-compose.yml`: runs server, worker, client and demo site together, with an `uploads` volume for screenshot evidence.
- Root `.dockerignore`: keeps `node_modules`, build output, uploads, notes and every `.env` file out of build contexts.

## How
- All images build from the repository root, because the worker reuses the API's audit allowlist and SSRF guard (`server/src/config/allowlist.js`, `server/src/utils/netGuard.js`).
- Package files are copied and installed before the source code, so the dependency layer stays cached until `package-lock.json` changes.
- Secrets reach the containers only through `env_file: server/.env`; nothing secret is baked into an image.
- Startup is health-gated: the worker and client wait until the server's `/api/health` check passes, and the worker also waits for the demo site.
- The worker shares the demo site's network namespace (`network_mode: service:demo-site`), so the allowlisted `http://localhost:4000` pages reach the demo container exactly as in local development. `shm_size: 1gb` gives Chromium enough shared memory.

## Result
- `docker compose config` validates the stack.
- Ports: client http://localhost:8080, API http://localhost:5000, demo site http://localhost:4000.
