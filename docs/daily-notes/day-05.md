# Day 5 — Request validation, protected routes and error handling

## Done
- Added zod schemas for register and login, applied through a reusable `validate(schema)` middleware.
- Added `requireAuth` middleware and a protected `GET /api/auth/me` route.
- Extended the central error handler to cover malformed JSON, invalid ObjectIds and duplicate-key errors.
- Extended `npm run smoke:auth` from 6 to 11 checks.

## How
- `validate()` runs `schema.safeParse(req.body)`. On success it replaces `req.body` with the cleaned data (trimmed, lower-cased email, unknown fields dropped). On failure it returns `400 { error, details: [{ field, message }] }`.
- Controllers now assume valid input and only hold business logic; shared `httpError(status, message, details)` lives in `utils/`.
- `requireAuth` reads `Authorization: Bearer <token>`, verifies the JWT, loads the user into `req.user` and returns the same `401` for missing, invalid, expired or orphaned tokens.
- `errorHandler` maps `entity.parse.failed` → 400, `CastError` → 400 and Mongo `11000` → 409. It includes `details` only on 4xx responses and still hides 5xx internals.

## Result
`npm run smoke` and all 11 `npm run smoke:auth` checks pass against MongoDB Atlas.
