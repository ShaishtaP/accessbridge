# Day 0 — Project setup

## Done
- Created the repository with a `main` branch and pushed it to GitHub.
- Added `.gitignore` so that dependencies, uploads, logs and every `.env` file stay out of version control.
- Added `server/.env.example` as a template for the required settings (`MONGODB_URI`, `PORT`, `JWT_SECRET`), without real values.
- Wrote the README (overview, stack, architecture) and `PROGRESS.md` with an 18-task roadmap.
- Provisioned a free MongoDB Atlas M0 cluster (AWS Mumbai) with a dedicated database user and an IP access rule.

## How
- Secrets live only in `server/.env`, which is git-ignored; the app reads them through environment variables.
- The work is split into small, independent tasks so every day ends with a working, pushed state.
