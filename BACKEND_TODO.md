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

## Teams (frontend already built against this)

- `POST /teams` — create a team. body `{ name, password }`
  - success: `{ team: { id, name, code } }` — `code` is a randomly generated 32-character string, shown to the creator once so they can share it
  - error: `{ statusMessage }`
- `POST /teams/join` — join a team. body `{ code, password }`
  - success: 2xx
  - error: `{ statusMessage }`
- List teams for current user
- Per-team roles: viewer, member, admin, owner
  - Needs endpoints to assign/change a member's role, and to enforce permissions server-side
- Not yet handled by the frontend: what happens if a user already belongs to a team on login (currently every login/register always lands on the create/join team screen)

## Workspaces

- Each team has one or more workspaces
- Workspace holds the team's data (scope/shape still TBD)
- CRUD for workspaces, scoped to a team + role check

## Profile

- Fields: profile icon, display name, email, password
- Local preferences (theme, date format, etc.) — likely client-side only, but confirm if backend should persist them per-user
- Endpoints for reading/updating profile
