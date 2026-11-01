# Day 6 — Workspaces, members and roles

## Done
- `Workspace` model: name, description, owner and an embedded `members` list (`user` + `role`), indexed on `members.user`.
- Three roles: `owner` (exactly one, set at creation), `admin` and `member`.
- zod schemas for creating a workspace, adding a member and changing a role.
- Routes under `/api/workspaces`, all behind `requireAuth`:
  - `POST /` creates a workspace; the creator becomes the owner.
  - `GET /` lists the workspaces the user belongs to, with `myRole`.
  - `GET /:id` returns one workspace with member names and emails.
  - `POST /:id/members` adds a registered user by email.
  - `PATCH /:id/members/:userId` changes a member's role.
  - `DELETE /:id/members/:userId` removes a member, or lets a member leave.
- `npm run smoke:workspaces`: 15 checks against the real database, with cleanup.

## How
- Every workspace request first loads the workspace and finds the caller in `members`. Non-members get `404`, so the API doesn't reveal which workspaces exist.
- Adding, promoting and removing others requires `owner` or `admin` (otherwise `403`). The owner role can't be assigned, changed or removed.
- Responses go through `toPublic()`, and member users are populated with only `name` and `email`.
- Invalid ids fall through to the central error handler's cast-error branch and return `400`.

## Result
All 15 workspace smoke checks pass.
