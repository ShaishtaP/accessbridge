# Day 1 — Express server and database connection

## Done
- Set up the `server/` package (Express 5, Mongoose 9, dotenv, cors) using ES modules.
- Connected the API to MongoDB Atlas; data is stored in the `accessbridge` database.
- Added `GET /api/health`, which reports API and database status.
- Added a 404 handler and a central error handler.
- Added `npm run smoke`, a quick check of the app that needs no database.

## How
- `src/app.js` exports `createApp()`, which builds the routes and middleware without starting a server. This keeps the app easy to test.
- `src/index.js` loads `server/.env`, connects to MongoDB, then starts listening on `PORT`.
- `src/config/db.js` wraps Mongoose with `connectDB()`, `disconnectDB()` and `dbStatus()`. It uses a 10-second server-selection timeout, so startup fails fast with a clear message.
- `/api/health` returns `200 { status: "ok", db: "connected" }`, or `503` when the database is unreachable.
- The error handler returns `{ error }` JSON and hides internal details of 5xx errors from clients.

## Result
`GET /api/health` → `200 {"status":"ok","db":"connected"}`
