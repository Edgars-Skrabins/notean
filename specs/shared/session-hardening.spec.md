# Session hardening — Spec

**Type:** feature
**Status:** in progress
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Today a login is a JWT valid for a fixed 24 hours. It can't be revoked (logout only forgets it in the browser) or renewed, and it travels in the WebSocket URL, where proxy logs can capture it. This spec moves logins to server-side sessions that last while you're active, end on logout, and end on other devices when you change your password. The WebSocket gets a short-lived ticket instead of the login token.

- **Users:** every logged-in user.
- **Usage:**
  - You stay logged in as long as you use the app at least once every 30 days. After 30 idle days, the next request gets 401 and the app goes to login, as it does today when a token expires.
  - *Log out* now ends the session on the server too. A copy of the token stops working immediately.
  - Changing your password (`change-password.spec.md`) logs out every other device and keeps you logged in where you changed it. The other devices go to login on their next request.
  - Deleting your account (`delete-account.spec.md`) ends all your sessions.
  - Nothing else changes visibly. The token stays in `localStorage`.
- **Rules:**
  - Each login or registration creates a session row. The token identifies that session.
  - A request is authenticated only if its session exists and was used in the last 30 days. Each authenticated request records use, at most once an hour per session.
  - WebSocket connections authenticate with a cable ticket. It's valid for 1 minute, tied to a session, and useless once that session ends. The login token is never put in a URL.
- **Out of scope:**
  - A "your devices" list or logging out single other devices. The table allows it later.
  - Moving the token to an httpOnly cookie.
  - Rate limiting beyond the existing rack-attack rules.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies. The `jwt` gem is still used to sign the session token and the cable ticket.

## 2.2 Structure

**Depends on:**
- `live-board-updates.spec.md`, for `CableService` (one consumer). If it isn't implemented yet, apply the cable ticket changes to both `EditingService` and `TeamChannelService` instead.
- `change-password.spec.md` and `delete-account.spec.md`, for the revocation hooks. Whichever of those is implemented later adds its hook if this spec came first.

**Data model:** edit `backend/db/migrate/20261025120000_create_schema.rb` and rebuild the databases. New table `user_sessions`:
- `user_id` (references users, null false, foreign key, indexed).
- `last_used_at` (datetime, null false).
- `created_at` and `updated_at`.

**Models:**
- New `UserSession`:
  - `belongs_to :user`.
  - `IDLE_EXPIRY = 30.days`.
  - `TOUCH_INTERVAL = 1.hour`.
  - Scope `active` (`last_used_at > IDLE_EXPIRY.ago`).
  - `touch_if_stale!` (updates `last_used_at` when it's older than `TOUCH_INTERVAL`).
- `User`: `has_many :user_sessions, dependent: :delete_all`.

**Tokens (`backend/lib/json_web_token.rb`):**
- The login token payload becomes `{ session_id: }` with no `exp`. The row decides validity.
- Cable tickets are `{ session_id:, purpose: "cable", exp: 1.minute.from_now }`.
- `decode` is unchanged. Callers check the payload.

**API:**
- `SessionsController#create` and `UsersController#create` create a `UserSession` and return the token from `JsonWebToken.encode(session_id: session.id)`. Login also deletes that user's expired sessions.
- `ApplicationController#current_user` decodes the token, finds `UserSession.active.find_by(id: payload[:session_id])`, calls `touch_if_stale!` and sets `@current_session`. The user is `@current_session.user`, which must also pass the deleted-user check if `delete-account` is in. Tokens with `purpose` are rejected here.
- New `DELETE /auth/session` (`SessionsController#destroy`, `authenticate_user!`): destroys `@current_session` and responds 204.
- New `POST /auth/cable_ticket` (`SessionsController#cable_ticket`, `authenticate_user!`): returns `{ ticket: JsonWebToken.encode({ session_id:, purpose: "cable" }, 1.minute.from_now) }`.
- `ApplicationCable::Connection#find_verified_user` reads `request.params[:ticket]`. It requires `purpose == "cable"` and an unexpired ticket whose session is active, and rejects otherwise. `?token=` is no longer accepted.
- Change password (`UsersController#update_password`): after a successful change, `current_user.user_sessions.where.not(id: @current_session.id).delete_all`.
- Delete account (`UsersController#destroy`): `current_user.user_sessions.delete_all`.
- `config/initializers/filter_parameter_logging.rb` already filters `token`. Add `ticket`.

**Frontend:**
- `AuthService.logout()` calls `DELETE /auth/session` (ignoring failures) before clearing local state as today.
- `CableService`:
  - Before creating the consumer, it requests a ticket (`POST /auth/cable_ticket`).
  - It creates the consumer with a URL function (`createConsumer(() => url)`) that returns `ws…/cable?ticket=<latest ticket>`.
  - While connected, it refreshes the ticket every 45 seconds, so ActionCable's automatic reconnects always find a valid one.
  - It stops refreshing on `disconnect()`.
- `AuthService.isAuthenticated()` stays a presence check. Expiry and revocation surface as 401 through the existing `setUnauthorizedHandler` path.

## 2.3 Decisions
1. **Revocable sessions how?** A sessions table, with the token carrying the session id. Rejected: a `token_version` on users (no per-device logout), and access plus refresh tokens (more frontend machinery). (2026-10-26)
2. **Lifetime?** A sliding 30 days of inactivity. Rejected: sliding 7 days, and a fixed 24 hours. (2026-10-26)
3. **Token storage?** Stays in `localStorage`. Rejected: an httpOnly cookie (CORS credentials, CSRF and cable auth changes). (2026-10-26)
4. **Sessions ended by a password change?** All except the current one. (2026-10-26)
5. **How does sliding renewal work?** The session row decides. The JWT has no `exp`, and `last_used_at` is touched at most hourly, so the frontend never refreshes tokens. Rejected: rotating short JWTs through a response header. (2026-10-26)
6. **Cable auth?** A 1-minute cable ticket from `POST /auth/cable_ticket`, refreshed while connected. Rejected: keeping the login token in the URL. (2026-10-26)
7. **Name of the new model?** `UserSession` (`user_sessions`), to avoid confusion with the frontend's `SessionService` and `SessionsController`. (2026-10-26, recorded while writing the spec; confirm during review)
8. **How does `CableService.subscribe` wait for the ticket?** It stays synchronous and returns a `CableSubscription` handle (`perform`, `unsubscribe`). The real ActionCable subscription is created once the ticket arrives; `unsubscribe` before that cancels it, and `perform` before that is dropped, as ActionCable already does before the socket opens. The channel services only change their field type. Rejected: an async `subscribe` returning `Promise<Subscription>`, which spreads the waiting into every caller. (2026-10-26)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` and `npm test` and note the counts.

### A. Data model
- [x] A1. Add the `user_sessions` table to the `create_schema` migration and rebuild the dev and test databases.
- [x] A2. Add the `UserSession` model and `User#user_sessions`. Model tests: `active` excludes sessions idle for 30 days; `touch_if_stale!` updates only after an hour.

### B. Auth
- [x] B1. Login and register create sessions, return session tokens, and clean up expired sessions on login. Update `JsonWebToken` and `test/lib/json_web_token_test.rb`. Update the test helper or fixtures that build `Authorization` headers, so every controller test authenticates through a session (add a `user_sessions.yml` fixture or a helper that creates one).
- [x] B2. `current_user` resolves through an active session and touches it; cable-purpose tokens are rejected. Tests:
  - A valid session works.
  - An idle 31-day session gets 401.
  - A deleted session row gets 401.
  - A cable ticket used as a bearer token gets 401.
- [x] B3. Add `DELETE /auth/session` and `POST /auth/cable_ticket` with routes. Tests: logout makes the same token get 401; a ticket is returned and expires after 1 minute (use `travel`).
- [x] B4. The cable connection accepts only valid tickets. Update `test/channels/application_cable` tests: a valid ticket connects; these are rejected:
  - An expired ticket.
  - A ticket for an ended session.
  - A login token passed as `?token=`.
- [x] B5. Revocation hooks in change password (other sessions deleted, current kept) and delete account (all deleted), if those specs are implemented. Add `ticket` to the filter parameters. Tests for each hook. (Neither change-password nor delete-account was on master on 2026-10-26, so only the filter parameter was added; whichever lands later adds its hook.)

### C. Frontend
- [x] C1. `AuthService.logout()` calls `DELETE /auth/session`. Spec test: it's called, and local state clears even if it fails.
- [x] C2. `CableService` fetches a ticket, uses a URL function and refreshes every 45 seconds while connected. Spec tests with fake timers: the URL uses `ticket=`, and the refresh happens and stops on disconnect.

### D. Docs
- [x] D1. Update the root `CLAUDE.md`:
  - `lib/json_web_token.rb` description: session tokens without expiry, plus cable tickets.
  - Auth: sessions table, 30-day sliding expiry, logout endpoint.
  - Channels: the connection authenticates with `?ticket=`.
  - Services: realtime opens the consumer with a cable ticket, not the token.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md`.
- [ ] Z2. Manual check in the running app:
  - Log in in two browsers; change the password in A; B goes to login on its next action, and A stays in.
  - Log out in A and replay A's old token with curl (401).
  - The network panel shows the cable URL with `ticket=` and no `token=`.
  - Leave a board open for over 2 minutes, briefly drop the connection (offline toggle), and confirm it reconnects.
