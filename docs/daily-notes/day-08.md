# Day 8 — Issues

## Done
- `Issue` model: page, title, description, severity, WCAG success criterion, optional axe rule id and CSS selector, status.
- `/api/workspaces/:id/issues` routes: create, list with filters, get one, update.
- `npm run smoke:issues`: 15 checks against the real database, with test data removed afterwards.

## How
- Severity uses axe-core's impact levels (`critical`, `serious`, `moderate`, `minor`) so automated audit results map onto issues directly.
- Status moves through `open`, `in_progress`, `fixed`, `verified`, `reopened` and `wont_fix`. `verified` and `reopened` are reserved for the retest workflow, so the update schema rejects them.
- The WCAG criterion is validated as `1.4.3`-style numbers with zod.
- Any workspace member can report and update issues. A new issue must point at a page in the same workspace, and every lookup is scoped to the workspace so ids from other workspaces return 404.
- The list endpoint validates `status`, `severity`, `pageId` and `wcag` query filters with zod and turns them into a Mongo query. Compound indexes on `workspace + status + severity` and `workspace + page` back the common filters.

## Result
All 15 issue smoke checks pass.
