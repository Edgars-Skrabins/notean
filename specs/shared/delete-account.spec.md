# Delete account — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Users can't delete their account today. This spec adds *Delete account* to the Profile page. The account is anonymised rather than hard-deleted, so the user's pages, diagrams, tickets and projects stay in their teams under their last nickname, the same way former members appear in `team-member-management.spec.md`.

- **Users:** any logged-in user who doesn't own a team.
- **Usage:**
  1. Profile page, new section *Delete account*, with a red *Delete account* button.
  2. Clicking it opens `app-confirm-dialog`: "Delete your account? You will be removed from all teams and can't log in again. Your content stays in your teams."
  3. On confirm:
     - **Success:** the app logs out (the same path as logout: `SessionService.clear()`, token removed), goes to the login page and shows the toast "Your account was deleted".
     - **The user owns teams:** the error reads "Transfer ownership or delete these teams first: <team names>", using the names returned with the `OWNS_TEAMS` error.
     - **Other errors:** a translated error message.
- **Rules:**
  - A user who owns any team can't delete their account. They transfer ownership or delete each team first.
  - Deleting:
    - Soft-removes every active membership through `MembershipRemoval`, with all its effects: owned projects move to the team owner, and project member rows, assignees, favorites and editing presence are removed.
    - Anonymises the user row:
      - The email becomes `deleted-<id>@deleted.invalid`.
      - The password digest is replaced with a digest of a random secret.
      - The avatar image is purged and `avatar_color` is cleared.
      - `deleted_at` is set.
  - A deleted user can't log in. Their old token stops working: `current_user` and the cable connection ignore users with `deleted_at`.
  - The original email is free again, so someone can register with it as a new, unrelated account.
  - Content created by the deleted user keeps showing their last nickname in each team, as for any former member.
- **Out of scope:**
  - Exporting your data before deletion.
  - A grace period or undo.
  - Deleting teams automatically.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies.

## 2.2 Structure

**Depends on:** `team-member-management.spec.md` (soft-removed memberships, `MembershipRemoval`, active-only `memberships` associations, `all_memberships` for nicknames). Implement it first.

**Data model:** edit `backend/db/migrate/20261025120000_create_schema.rb` and rebuild the databases: `users.deleted_at` (datetime, null).

**Models:**
- `User#deleted?`.
- `User#anonymise!` (does everything in the anonymise rule inside a transaction, after removing memberships).
- `User.active` scope.

**API:** `DELETE /users/me` in `UsersController#destroy` (`authenticate_user!`). Responds `204`. Errors:
- `ErrorCodes::Users::OWNS_TEAMS` (422), with body `{ code: "OWNS_TEAMS", teams: [{ code, name }] }`. This is the one error that carries data, because the UI must name the teams. `render_error` is extended with an optional `extra:` hash merged into the body, rather than building the JSON by hand.

**Auth:**
- `ApplicationController#current_user` looks the user up with `User.active.find_by(id: ...)`.
- `ApplicationCable::Connection#find_verified_user` does the same.
- `SessionsController#create` uses `User.active.find_by(email: ...)`, so a deleted user gets `INVALID_CREDENTIALS`. Their scrubbed email couldn't match anyway; this is defence in depth.

**Frontend:**
- `AuthService.deleteAccount()` returns `Result<{}, DeleteAccountErrorCode>`. The failure carries `teams` for `OWNS_TEAMS`. Extend the result model only as far as this needs, and keep `apiRequest`'s shape.
- `config/errorCodes/users.ts`: `OWNS_TEAMS`.
- `pages/dashboard/profile`: the section, confirm dialog, logout and redirect.
- `PHRASES` and translations: section title, button, confirm message, success toast, and `ERRORS.USERS.OWNS_TEAMS` with a `{{teams}}` parameter.

## 2.3 Decisions
1. **Teams the user owns?** Deletion is blocked until ownership is transferred or the teams are deleted. Rejected: deleting solo teams automatically. (2026-10-26)
2. **What happens to the user's data?** The user row is anonymised and kept, so creator foreign keys stay valid and authorship shows the last nickname. Rejected: hard delete with content reassigned to team owners. (2026-10-26)
3. **Confirmation?** The plain confirm dialog. Rejected: entering the password, and typing the email. (2026-10-26)
4. **Where does it live?** The Profile page (auth-related). (2026-10-26)
5. **Scrubbed email format?** `deleted-<id>@deleted.invalid`. It's unique, passes the email format validation, and `.invalid` can never be a real domain. (2026-10-26, recorded while writing the spec; confirm during review)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` and `npm test` and note the counts.

### A. Data model
- [ ] A1. Add `deleted_at` to `users` in the `create_schema` migration and rebuild the dev and test databases.
- [ ] A2. Add `User.active`, `deleted?` and `anonymise!`. Model tests:
  - Each anonymised field.
  - Memberships are soft-removed through `MembershipRemoval`, and projects they owned move to each team's owner.
  - The original email can register again.

### B. API
- [ ] B1. Make `current_user`, the cable connection and `SessionsController#create` ignore deleted users. Tests: an old token gets 401 after deletion, cable connect is rejected, and login fails.
- [ ] B2. Add the `extra:` option to `render_error`, `OWNS_TEAMS` in `error_codes/users.rb`, the `DELETE /users/me` route and `UsersController#destroy`. Controller tests:
  - Success returns 204.
  - A team owner gets `OWNS_TEAMS` with the team list.
  - Content created by the user still shows their nickname in `creator`.

### C. Frontend
- [ ] C1. Add `AuthService.deleteAccount` and the error code, carrying `teams`. Spec tests.
- [ ] C2. Profile *Delete account* section: confirm dialog, logout and redirect with toast on success, and the `OWNS_TEAMS` message listing team names. Component spec tests.
- [ ] C3. Add the `PHRASES` keys and translations to every file in `public/assets/translations/`.

### D. Docs
- [ ] D1. Update the root `CLAUDE.md` Models section: deleted users are anonymised with `deleted_at`, and auth ignores them.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md`.
- [ ] Z2. Manual check in the running app:
  - As a team owner, Delete account shows the team list.
  - Transfer ownership, then delete: you're logged out to login with the toast.
  - Logging in again fails.
  - Another member still sees your pages under your nickname.
