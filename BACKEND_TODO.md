# Backend TODO

Temporary tracking doc for what the Ruby backend needs to support, based on what the frontend currently assumes or will soon need. Ruby backend work is paused for now — this is so we don't lose context when we get back to it. Delete this file once the backend catches up and real API docs exist.

## Auth (frontend already built against this)

- `POST /auth/login` — body `{ email, password }`
  - success: `{ token }` (JWT)
  - error: `{ statusMessage }`
- `POST /auth/register` — body `{ email, password }`
  - success: `{ token }` (JWT)
  - error: `{ statusMessage }`
- Auth is bearer-token based (`Authorization: Bearer <token>`), no cookies/sessions.
- Frontend keeps the token in memory only (no localStorage), so it's lost on refresh. No refresh-token flow exists yet — needs a decision on whether/how to add one.

## Teams

- Create team
- Join team
- List teams for current user
- Per-team roles: viewer, member, admin, owner
  - Needs endpoints to assign/change a member's role, and to enforce permissions server-side

## Workspaces

- Each team has one or more workspaces
- Workspace holds the team's data (scope/shape still TBD)
- CRUD for workspaces, scoped to a team + role check

## Profile

- Fields: profile icon, display name, email, password
- Local preferences (theme, date format, etc.) — likely client-side only, but confirm if backend should persist them per-user
- Endpoints for reading/updating profile
