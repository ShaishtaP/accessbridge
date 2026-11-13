# Day 19 — Issue detail: evidence, timeline and verification

## Done
- Issue detail page at `/workspaces/:id/issues/:issueId` showing severity, status, WCAG criterion, axe rule id and element selector.
- Verification panel: manual status changes (open, in progress, fixed, won't fix) and a "Request retest" button for fixed issues that have a rule id and selector.
- Live retest progress: the queued job is polled every 3 seconds; when it finishes, the issue reloads with its new status (verified or reopened).
- Evidence section listing keyboard notes and screenshots (before/after fix), with forms to add a keyboard note and upload a screenshot with a caption.
- Activity timeline listing every event on the issue in order, with field-level changes such as `status: fixed → verified`.

## How
- `api()` accepts `FormData` bodies and leaves the multipart `Content-Type` to the browser, so screenshot uploads go through the same helper as JSON requests.
- Screenshot downloads are member-only and need the `Authorization` header, which `<img src>` cannot send. `fetchFileUrl()` fetches the file with the token and returns an object URL; the URL is revoked when the image unmounts.
- Evidence stays append-only in the UI as well as the API: items can be added, never edited or removed. The caption doubles as the screenshot's alt text.
- The timeline reloads through a `refreshKey` prop that the page bumps after a status change, retest result or new evidence.
- "Verified" and "reopened" are not offered in the status menu, because only the retest worker sets them; the API rejects them too.
- Accessibility: labelled form fields, headings per section, `<time>` elements for timestamps, and results announced through `role="status"` / `role="alert"` regions.

## Result
- `vite build` succeeds with the new page and components.
