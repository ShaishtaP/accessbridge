# Day 25 — Final README and live end-to-end run

## Done
- Full audit run on the deployed stack: four demo pages added through the live client, audits queued from the browser, processed by the worker and shown as done with live status updates.
- Live metrics: recall 19 of 20 automatable seeded defects (95%) on the deployed demo site, API p95 193 ms on Render.
- Screenshots of the workspace, issue list, issue detail (evidence, retest and timeline) and metrics pages in `docs/screenshots/`.
- README rewritten: live links, screenshots, results table, feature list, Mermaid architecture diagram, tech stack, local and Docker setup, testing and deployment.

## How
- Screenshots come from a scripted Playwright session against the local stack with a throwaway account: the script seeds a workspace, runs real audits, walks one issue through fixed → retest → reopened, captures the pages and removes all of its data afterwards.
- The deployed run uses the same database-backed queue: jobs created by the API on Render are claimed by a worker started with `npm run start:live`.

## Result
- All four deployed demo pages audited: 19 issues (6 critical, 10 serious, 2 moderate, 1 minor), the same findings as the local runs.
- All 24 planned tasks plus the workspace-management task are complete; CI is green on `main`.
