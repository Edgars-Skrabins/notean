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
- Frontend now persists the token + user in `localStorage`, so a page refresh keeps you logged in. No refresh-token/expiry flow exists yet — a token just lasts as long as the JWT itself is valid; no decision made yet on what happens once it expires (still silently treated as logged-in client-side until the first request 401s).

## Teams — done

- `POST /teams` — create a team, requires auth. body `{ team: { name, password } }`
  - success: `{ team: { id, name, code }, statusMessage }` — `code` is a server-generated, unique 32-character string, shown to the creator once so they can share it. The client never supplies a code on create.
  - error: `{ statusMessage }`
- `POST /actions/jointeam` — join a team, requires auth. body `{ team: { code, password } }`
  - success: `{ team: {...}, statusMessage }`
  - error: `{ statusMessage }`
- `GET /teams/:code` — requires auth, not yet called by the frontend but available for a future "resume last team" flow
- `GET /teams/mine` — **spec'd, not yet built** (see `backend/TODO.md`) — used on login to skip team selection if the user already belongs to a team
- Frontend also persists the current team in `localStorage` (same as auth), so refreshing while in the dashboard doesn't bounce you back to team selection even before `/teams/mine` exists
- Still missing: list ALL of a user's teams (only "most recent" via `/teams/mine`), leave a team
- Per-team roles beyond owner/member (viewer, admin) and permission enforcement — not started

## Workspaces

- Each team has one or more workspaces
- Workspace holds the team's data (scope/shape still TBD)
- CRUD for workspaces, scoped to a team + role check

## Profile

- Fields: profile icon, display name, email, password
- Local preferences (theme, date format, etc.) — likely client-side only, but confirm if backend should persist them per-user
- Endpoints for reading/updating profile
