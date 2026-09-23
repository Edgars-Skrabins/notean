# Backend TODO

Tracking doc for what the Ruby backend needs to support, based on what the frontend currently assumes or will soon need.

## Auth — done

- `POST /auth/register` — body `{ user: { email, username, password } }`
  - success: `{ user: { id, email, username }, token, statusMessage }` (JWT)
  - error: `{ statusMessage }`
- `POST /auth/login` — body `{ user: { email, password } }`
  - success: `{ user: { id, email, username }, token, statusMessage }` (JWT)
  - error: `{ statusMessage }`
- Auth is bearer-token based (`Authorization: Bearer <token>`), no cookies/sessions.
- Frontend keeps the token in memory only (no localStorage), so it's lost on refresh. No refresh-token flow exists yet — needs a decision on whether/how to add one.

## Teams — done

- `POST /teams` — create a team, requires auth. body `{ team: { name, password } }`
  - success: `{ team: { id, name, code }, statusMessage }` — `code` is a server-generated, unique 32-character string, shown to the creator once so they can share it. The client never supplies a code on create.
  - error: `{ statusMessage }`
- `POST /actions/jointeam` — join a team, requires auth. body `{ team: { code, password } }`
  - success: `{ team: {...}, statusMessage }`
  - error: `{ statusMessage }`
- `GET /teams/:code` — requires auth, not yet called by the frontend but available for a future "resume last team" flow
- Still missing: list teams for current user, leave a team
- Per-team roles beyond owner/member (viewer, admin) and permission enforcement — not started
- Not yet handled by the frontend: what happens if a user already belongs to a team on login (currently every login/register always lands on the create/join team screen)

## Workspaces

- Each team has one or more workspaces
- Workspace holds the team's data (scope/shape still TBD)
- CRUD for workspaces, scoped to a team + role check

## Profile

- Fields: profile icon, display name, email, password
- Local preferences (theme, date format, etc.) — likely client-side only, but confirm if backend should persist them per-user
- Endpoints for reading/updating profile
