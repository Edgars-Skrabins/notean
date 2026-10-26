# Change password — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Users can't change their password today. This spec adds a Change password section to the Profile page. Profile holds auth-related things; Settings holds app preferences.

- **Users:** any logged-in user.
- **Usage:**
  1. Profile page, new section *Password*, with three fields: *Current password*, *New password* (with the hint "At least 8 characters") and *Confirm new password*, plus a *Change password* button.
  2. The button is disabled until all three fields are filled.
  3. If the new password and its confirmation differ, or the new password is under 8 characters, a translated error shows under the section and no request is sent.
  4. On success the fields clear and a toast says "Password changed". The user stays logged in.
  5. On an API error a translated message shows under the section: wrong current password, too short, or unknown.
  6. This section saves on its own. It doesn't take part in Profile's unsaved-changes guard or its Save button.
- **Rules:**
  - The current password must be correct.
  - The new password follows the minimum length rule from `password-min-length.spec.md` (8 characters).
  - The new password may equal the old one. There's no reuse check.
  - Other logged-in sessions are not ended by this spec. Revoking other sessions on a password change belongs to `session-hardening.spec.md`.
- **Out of scope:**
  - Password reset by email (needs email sending, which comes later).
  - Ending other sessions (session hardening).

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies.

## 2.2 Structure
- **API:** `PATCH /users/me/password` in `UsersController#update_password` (`authenticate_user!`), with body `{ password: { current_password, new_password } }`.
  - Responds `204` on success.
  - Errors:
    - `ErrorCodes::Auth::CURRENT_PASSWORD_INVALID` (422) when `current_user.authenticate(current_password)` fails.
    - `ErrorCodes::Auth::PASSWORD_TOO_SHORT` (422), from the minimum-length spec, when the length validation fails.
  - Strong params: `update_password_params` in `ApplicationController`.
- **Route:** `patch "users/me/password" => "users#update_password"` in `backend/config/routes.rb`.
- **Frontend:**
  - `AuthService.changePassword(currentPassword, newPassword)` returns `Result<{}, ChangePasswordErrorCode>` through `apiRequest`.
  - `config/errorCodes/auth.ts`: `CURRENT_PASSWORD_INVALID`.
  - `pages/dashboard/profile`: the new section. Reuse the `authField` and `authButton` styles already used on Profile and Manage team, plus `utils/passwordValidation.ts` from the minimum-length spec.
  - `PHRASES` and every translation file: section title, field labels, button, mismatch error, success toast, and `ERRORS.AUTH.CURRENT_PASSWORD_INVALID`.

**Depends on:** `password-min-length.spec.md` (`PASSWORD_TOO_SHORT`, `PASSWORD_MIN_LENGTH`, `utils/passwordValidation.ts`). Implement that spec first.

## 2.3 Decisions
1. **Where does Change password live?** The Profile page, because Profile holds auth-related things and Settings holds app preferences. Rejected: an Account section in Settings, and a separate Account page. (2026-10-26)
2. **Other sessions after a change?** Untouched here; handled in the session hardening spec. (2026-10-26)
3. **Does the section join Profile's unsaved-changes guard?** No. It's a separate action with its own button, and leaving with typed passwords shouldn't prompt. (2026-10-26, recorded while writing the spec)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` and `npm test` and note the counts (397 backend and 595 frontend before `password-min-length`).

### A. Backend
- [ ] A1. Add the route, `update_password_params`, `CURRENT_PASSWORD_INVALID` in `error_codes/auth.rb`, and `UsersController#update_password`. Controller tests:
  - Success: 204, and login works with the new password but not the old one.
  - Wrong current password: `CURRENT_PASSWORD_INVALID`.
  - Too short: `PASSWORD_TOO_SHORT`.
  - No token: 401.

### B. Frontend
- [ ] B1. Add `AuthService.changePassword` and the error code. Spec tests for success and error mapping.
- [ ] B2. Profile page *Password* section as in Part 1. Component spec tests:
  - The button stays disabled until all fields are filled.
  - A mismatch or a short password shows an error with no request sent.
  - Success clears the fields and toasts.
  - An API error shows the translated message.
  - The section doesn't trigger the unsaved-changes guard.
- [ ] B3. Add the `PHRASES` keys and translations to every file in `public/assets/translations/`.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md`.
- [ ] Z2. Manual check in the running app: change the password on Profile, log out, log in with the new password; try a wrong current password and see the error.
