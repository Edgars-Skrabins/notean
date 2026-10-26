# Team show endpoint removal — Spec

**Type:** bug fix
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

`GET /teams/:code` (`TeamsController#show`) returns a team's JSON (name, code, feature flags) to any logged-in user who knows the team code. It runs `set_team` but never checks that the caller is a member, unlike every other team endpoint. The frontend never calls this endpoint, so the fix removes it.

How to reproduce: log in as a user who is not a member of team T and send `GET /teams/<T's code>` with that user's token. Today the response is 200 with T's JSON. After the fix it is 404, because the route no longer exists.

- **Users:** nobody uses this endpoint. The frontend only uses `teams/mine`, `teams/mine/all`, `activate`, `members`, `nickname`, `features`, `PATCH /teams/:code` and `DELETE /teams/:code`.
- **Usage:** no visible change in the app.
- **Rules:** team data reaches only members, through the endpoints that already check membership.
- **Out of scope:** the other findings from the 2026-10-25 review, which have their own specs.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies.

## 2.2 Structure
- `backend/config/routes.rb`: `resources :teams, only: [ :create, :show, :update, :destroy ]` becomes `only: [ :create, :update, :destroy ]`.
- `backend/app/controllers/teams_controller.rb`: remove the `show` action and remove `:show` from the `set_team` `before_action` list.
- `backend/test/controllers/teams_controller_test.rb`: remove any test that calls `GET /teams/:code`. Add one test asserting the route no longer exists.
- Frontend: no changes. Confirm with a search that nothing in `frontend/src` calls `GET` on `teamUrl(code)` without a suffix.

## 2.3 Decisions
1. **Remove the endpoint or add a membership check?** Remove it. Nothing uses it, so removing it shrinks the surface that has to be secured. The rejected alternative was returning 403 `NOT_TEAM_MEMBER` like `/members` does. (2026-10-26)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: backend 397 tests, frontend 595 tests (run both to confirm).

### A. Remove the endpoint
- [ ] A1. Remove `:show` from the teams resource in `backend/config/routes.rb`, and remove the `show` action plus its `set_team` entry in `backend/app/controllers/teams_controller.rb`.
- [ ] A2. In `backend/test/controllers/teams_controller_test.rb`, delete tests of `GET /teams/:code` and add a test that `GET /teams/<code>` with a valid token returns 404.
- [ ] A3. Search `frontend/src` for a plain `GET` on the team URL and confirm nothing calls it. No frontend change is expected.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`bin/rails test`, `bin/rubocop`, `npm test`, `npm run build`).
- [ ] Z2. Manual check in the running app: log in, switch teams and open Manage team; everything still loads.
