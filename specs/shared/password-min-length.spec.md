# Password minimum length — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Account passwords have no minimum length today. `has_secure_password` only enforces a 72-byte maximum, so a one-character password is accepted. This spec adds an 8-character minimum for account passwords.

- **Users:** anyone registering, and later anyone changing their password (see `change-password.spec.md`, which reuses this rule).
- **Usage:**
  - The register form shows a hint under the password field: "At least 8 characters".
  - Submitting a shorter password shows the translated error "Password must be at least 8 characters" and makes no request.
  - If the API still rejects it, the same message shows from the `PASSWORD_TOO_SHORT` error code.
- **Rules:**
  - An account password must be at least 8 characters. There are no composition rules (no required digits or symbols).
  - The rule applies wherever a user password is set. Login only checks the password and never enforces length.
  - Team passwords (join with code and password) are not affected.
- **Out of scope:**
  - Existing users. The database is rebuilt from scratch, so there are no old short passwords to handle.
  - Password strength meters and breached-password checks.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies.

## 2.2 Structure
- `backend/app/models/user.rb`:
  - `PASSWORD_MIN_LENGTH = 8`.
  - `validates :password, length: { minimum: PASSWORD_MIN_LENGTH }, allow_nil: true`. `allow_nil` keeps saves that don't touch the password valid.
- `backend/app/errors/error_codes/auth.rb`: `PASSWORD_TOO_SHORT`.
- `backend/app/controllers/users_controller.rb#create`: when `@user.errors.of_kind?(:password, :too_short)`, render `PASSWORD_TOO_SHORT` with 422 instead of `REGISTRATION_FAILED`.
- `backend/test/fixtures/users.yml` and test helpers: any test password shorter than 8 characters is lengthened.
- Frontend:
  - `config/errorCodes/auth.ts`: the new code.
  - New `utils/passwordValidation.ts` exporting `PASSWORD_MIN_LENGTH = 8` and `isPasswordLongEnough(password)`, mirroring `utils/nicknameValidation.ts`.
  - `pages/register`: the hint and client-side check.
  - `PHRASES` keys and every translation file, for the hint, the client error and `ERRORS.AUTH.PASSWORD_TOO_SHORT`.

## 2.3 Decisions
1. **Minimum length?** 8 characters, length only. This is the NIST baseline. Rejected: 10 characters, and 8 with a required letter and digit. (2026-10-26)
2. **Existing short passwords?** Not handled. The database is reset and rebuilt, so there are no existing users. (2026-10-26)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: backend 397 tests, frontend 595 tests (run both to confirm).

### A. Backend
- [ ] A1. Add `PASSWORD_MIN_LENGTH` and the length validation to `User`. Model tests: 7 characters is invalid, 8 is valid, and updating another attribute without a password stays valid.
- [ ] A2. Add `PASSWORD_TOO_SHORT` to `error_codes/auth.rb` and render it from `UsersController#create`. Controller test: registering with 7 characters returns 422 `PASSWORD_TOO_SHORT`.
- [ ] A3. Lengthen any short passwords in fixtures and tests so the suite passes.

### B. Frontend
- [ ] B1. Add `utils/passwordValidation.ts` with spec tests, and add the code to `config/errorCodes/auth.ts`.
- [ ] B2. Register page: the hint, plus the client check before submit. Component spec test: a short password shows the error and doesn't call `AuthService.register`.
- [ ] B3. Add the `PHRASES` keys and translations to every file in `public/assets/translations/`.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md`.
- [ ] Z2. Manual check in the running app: register with a 7-character password (blocked with the message), then with 8 (succeeds).
