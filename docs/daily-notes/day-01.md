# Day 1 — Express server + health check (partial)

**What was built:** The API server in `server/`: an Express app (`src/app.js`), a MongoDB connection helper (`src/config/db.js`), a `GET /api/health` route, a 404 + error handler, and a smoke script (`npm run smoke`) that tests the app without a database.

**Why:** Every later feature (users, issues, audits) plugs into this app. The health route gives a quick way to tell whether the API and the database are up.

**Status / your action needed:** Starting the server fails with `bad auth : authentication failed` from MongoDB Atlas. The password in `MONGODB_URI` in `server/.env` is probably wrong. In Atlas, go to Database Access, reset the user's password, paste it into `server/.env`, then run `npm start` in `server/` and open http://localhost:5000/api/health. You should see `"db": "connected"`.

**3 key terms**
- **Middleware**: a function that runs on every request before the route, e.g. `express.json()` reads JSON bodies.
- **Health check**: a tiny route that monitoring tools call to see if a service is alive.
- **HTTP 503**: "Service Unavailable". We return it when the API is running but the database is not.

**Interview question:** *Why split the app (`app.js`) from the server start (`index.js`)?*
**Answer:** `createApp()` only builds the routes, so tests and scripts can start it on any port without connecting to the real database. `index.js` handles the startup work: loading `.env`, connecting to MongoDB and listening on a port.
