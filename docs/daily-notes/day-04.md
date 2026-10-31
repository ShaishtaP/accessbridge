# Day 4 — User accounts: register and login

## Done
- Added a `User` model (name, unique lowercase email, password hash, timestamps).
- Added `POST /api/auth/register` and `POST /api/auth/login`, both returning the public user and a signed JWT.
- Added `npm run smoke:auth`, an end-to-end check against the real database that cleans up its test user.

## How
- Passwords are hashed with `bcryptjs` (10 salt rounds) before saving. The hash field uses `select: false`, so it only loads when login asks for it, and `toPublic()` controls what reaches clients.
- Register validates required fields and an 8-character minimum, returns `409` for a taken email and `201` on success.
- Login returns the same `401 Invalid email or password` for an unknown email and a wrong password, so accounts can't be probed.
- Tokens are signed with `JWT_SECRET`, carry only the user id (`sub`) and expire after 7 days.
- Handlers are plain `async` functions; Express 5 forwards rejected promises to the central error handler.

## Result
All 6 auth checks pass: register `201`, no hash in responses, duplicate `409`, short password `400`, login `200`, wrong password `401`.
