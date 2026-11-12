# Day 17 — React client setup, login and register

## Done
- New `client/` app: Vite, React, React Router and Tailwind CSS 4.
- Dev server proxies `/api` to the Express API on port 5000, so the browser talks to a single origin.
- `api()` helper that sends JSON, attaches the saved JWT and turns `{ error }` responses into thrown errors.
- `AuthProvider` context: restores the session from the saved token via `GET /api/auth/me`, plus `login`, `register` and `logout`.
- `RequireAuth` wrapper that redirects logged-out visitors to `/login` and returns them to the page they asked for.
- Login and register pages built on shared `AuthCard` and `TextField` components.

## How
- The token lives in `localStorage`; an invalid or expired token is cleared when `/auth/me` rejects it.
- Forms use real `<label>` elements, `autocomplete` hints and a described password hint. Errors appear in a `role="alert"` box that takes focus, so they are announced by screen readers.
- The layout has a skip link, a labelled main navigation and a visible `:focus-visible` outline.
- Register checks the same rules as the server's zod schema (name, email, 8+ character password) before sending.

## Result
- `npm run build` produces the production bundle; the dev server serves `/login` and `/register` through the SPA router.
