# Day 2 — Demo site with seeded accessibility defects

## Done
- Built the Greenleaf Café demo site in `demo-site/`: a home page, a contact page, a shared stylesheet and a local hero image.
- Seeded 16 deliberate accessibility defects across the two pages: 11 that axe-core should catch and 5 that need manual testing (focus visibility, keyboard access, colour-only cues, vague link text, placeholder-only labels).
- Added `demo-site/seeded-defects.json`, the ground-truth list used later to measure audit recall.

## How
- Every defective element carries a `data-defect="ID"` attribute, so each finding can be traced back to a known defect. Page-level defects (missing `lang`, missing title) target `html` and `head`.
- Each entry in `seeded-defects.json` records the page, CSS selector, WCAG success criterion, severity and the axe-core rule expected to detect it (`null` for manual-only defects).
- Recall can then be computed as *matched findings ÷ seeded defects*, separately for automated and manual checks.
- The site has no external dependencies, so audits run fully offline against local pages.

## Result
16 defects seeded (8 on the home page, 8 on the contact page), and every `data-defect` marker is verified to be present in the HTML.
