# Day 12 — Real audits with Playwright and axe-core

## Done
- The worker now opens each queued page in headless Chromium (Playwright) and runs axe-core 4.14 on it.
- Every scan is stored as an `AuditRun` (engine version, duration, violations, failing elements, rules axe could not decide).
- Every failing element becomes an issue with severity, WCAG criterion, rule id, selector and fix guidance, plus an `issue.created` timeline event. Re-auditing reuses open issues instead of duplicating them.
- Added `npm run smoke` in `worker/`: an end-to-end audit of all 4 demo pages with recall measured against `seeded-defects.json`.

## How
- **Scanner:** one shared browser, with a fresh isolated context per job. Navigation has a 30 s timeout, and a non-2xx response fails the job, so the queue's retry logic takes over.
- **Allowlist enforced twice:** the worker re-validates the URL with the API's `checkAuditUrl()` before visiting, and `page.route('**/*')` aborts every request (redirects, scripts, images) to a non-allowlisted origin.
- **WCAG mapping:** axe tags such as `wcag143` become `1.4.3`; best-practice rules without a criterion are labelled `best-practice`. axe `impact` maps directly onto issue severity.
- **Deduplication:** an issue matches on workspace + page + rule + selector while it is not `verified` or `wont_fix`. A defect that comes back after verification opens a fresh issue.
- The worker keeps its own lightweight mongoose views of `issues`, `activityevents` and `auditruns`, because it runs as a separate process with its own database connection.

## Result
| Page | Scan time | Rules violated |
|---|---|---|
| index.html | ~1.7 s (includes browser start) | 5 |
| menu.html | ~0.8 s | 5 |
| about.html | ~1.0 s | 3 |
| contact.html | ~0.8 s | 6 |

- **Recall: 19/20 automatable seeded defects (95%)**, which is 19/27 of all seeded defects. The miss is A-02: an `aria-labelledby` pointing at a missing id is not reported by axe's `aria-valid-attr-value`.
- No violations outside the seeded list on the demo pages.
- A non-allowlisted URL (`https://example.com`) is refused and fails after 3 attempts.
- `worker` smoke 7/7; server `smoke:audits` 12/12, and every other server suite still passes.
