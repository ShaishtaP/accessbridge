# Day 0 — Project setup

## What was built
- Created the `accessbridge` folder and the GitHub repo.
- Added `.gitignore`, `README.md`, `PROGRESS.md` and `server/.env.example`.

## Why it matters
- **`.gitignore`** tells Git which files to never upload. The most important one is `.env`, which holds the database password. If it were pushed to a public repo, anyone could read your database.
- **`.env.example`** is a safe template: it shows *which* settings the app needs, without the real values. Anyone cloning the repo copies it to `.env` and fills in their own.
- **`PROGRESS.md`** is the build plan. Breaking a big project into small tasks makes it manageable — a habit interviewers like to hear about.

## Key terms
- **Repository (repo):** a project folder tracked by Git, with its full history.
- **Commit:** a saved snapshot of changes, with a message describing them.
- **Push:** uploading your commits to GitHub.
- **Environment variable:** a setting (like a password or port) kept outside the code.

## Interview question to practice
*"How do you keep secrets like database passwords out of your code?"*
→ Store them in environment variables loaded from a `.env` file, list `.env` in `.gitignore`, and commit only a `.env.example` template.
