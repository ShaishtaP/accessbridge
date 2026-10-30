# Day 3 — More demo pages and a local static server

## Done
- Added two pages to the demo site: `menu.html` (table, list and ARIA defects) and `about.html` (frame, timing, motion and labelling defects), and linked all four pages in the navigation.
- Expanded `seeded-defects.json` to 27 defects across 4 pages: 20 detectable by axe-core and 7 that need manual testing.
- Added `demo-site/server.js`, a zero-dependency Node static server (`npm start` in `demo-site/`, port 4000).

## How
- The new defects cover rule families not used on day 2: `empty-table-header`, `list`, `aria-hidden-focus`, `meta-viewport`, `aria-roles`, `frame-title`, `aria-valid-attr-value`, `marquee` and `meta-refresh`.
- The server uses only `node:http` and `node:fs`. It binds to `127.0.0.1`, normalises every requested path, rejects anything outside the site folder or any dotfile, and serves only HTML, CSS, SVG and JSON.
- Audits will target `http://localhost:4000/*`, so scans stay on local, allowlisted pages.

## Result
All 4 pages and their assets return `200`. Path-traversal attempts such as `/../server/.env` return `404`.
