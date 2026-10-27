# AccessBridge

**An accessibility issue tracker that turns page audits into verified fixes.**

Teams log accessibility problems found on web pages, attach evidence (screenshots, keyboard-navigation notes, automated scan results), fix them, and then *prove* the fix with a retest. An issue only closes once the retest passes, and both the original finding and the retest evidence are kept, so every closure is auditable.

> 🚧 Work in progress. See [PROGRESS.md](PROGRESS.md) for the build plan and daily log.

## Tech stack

| Part | Technology |
|---|---|
| Dashboard | React (Vite), React Router, Tailwind CSS |
| API | Node.js, Express, Mongoose, JWT auth |
| Database | MongoDB Atlas |
| Audit worker | Node.js, Playwright, axe-core |
| Demo site | Static HTML/CSS with deliberately seeded accessibility defects |

## Architecture

```
React dashboard  →  Express API  →  MongoDB Atlas
                         ↑
        Audit worker (Playwright + axe-core)
                         ↓
       Demo site (allowlisted local pages only)
```

## Project structure

```
accessbridge/
├── client/      React dashboard
├── server/      Express API
├── worker/      Audit worker
├── demo-site/   Demo pages with seeded defects
└── docs/        Daily notes and documentation
```

## Note on scope

Automated checks catch only part of the accessibility problems on a page. They do not establish full accessibility compliance; manual review is still required.
