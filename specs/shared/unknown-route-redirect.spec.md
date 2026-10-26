# Unknown route redirect — Spec

**Type:** bug fix
**Status:** ready for implementation
**Last updated:** 2026-10-27

# Part 1 — Business logic and usage

Opening a frontend URL that matches no route, such as `/dashboard/settings` (Settings lives at `/settings`), `/foo` or `/dashboard/boards/5/foo`, makes the Angular router throw `NG04002: Cannot match any routes` and leaves a blank page at `/`. Neither `app/app.routes.ts` nor `app/dashboard.routes.ts` has a `**` wildcard route. The bug exists on `master` and on the Angular 22 upgrade branch.

Expected: an unknown URL sends the user to the right starting screen for their session, silently.

To reproduce: run the app, log in, select a team and open `http://localhost:4200/dashboard/settings`. The page is blank and the console shows `NG04002`.

- **Users:** anyone who follows an old or mistyped link, or edits the address bar.
- **Usage:** the user opens an unknown URL and lands on:
  - Login, when not logged in;
  - Team selection, when logged in but no team is selected;
  - Dashboard Home, when logged in with a team selected.
  No toast, message or not-found screen is shown.
- **Rules:**
  - Only URLs that match no route are affected. Known routes, their guards and the existing redirects (`''` → `/login`, `boards/:id` → `kanban`, `backlog` → `list`) behave exactly as today.
  - Unknown paths anywhere, including under `/dashboard` and under a board (`/dashboard/boards/:id/<unknown>`), follow the same rule. There is no board-specific fallback.
  - The redirect replaces the unknown URL, so the address bar shows the destination.
- **Out of scope:**
  - A not-found page or a toast (decided against, see 2.3).
  - The empty path `''` always going to `/login`, even for logged-in users. That is existing behaviour of a known route.
  - Item URLs whose route matches but whose item doesn't exist (e.g. `/dashboard/pages/999999`). Those are handled by each screen's API error handling.

# Part 2 — Technical details

## 2.1 Tools and libraries

Angular Router only, using a functional `redirectTo` (a function returning a `UrlTree`, run in an injection context; available since Angular 18). No new dependencies, no new phrases or translations.

## 2.2 Structure

New file `frontend/src/app/guards/unknown-route.redirect.ts` exporting `unknownRouteRedirect`, a `RedirectFunction`:

- injects `AuthService`, `TeamService` and `Router`;
- not `authService.isAuthenticated()` → `router.createUrlTree([AppRoutes.LOGIN])`;
- `teamService.getCurrentTeam() === null` → `router.createUrlTree([AppRoutes.TEAM_SELECTION])`;
- otherwise → `router.createUrlTree([AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME])`.

Changed file `frontend/src/app/app/app.routes.ts`: add `{path: '**', redirectTo: unknownRouteRedirect}` as the last entry of `routes`.

`dashboard.routes.ts` gets no wildcard. When the lazy-loaded dashboard children (or a board's children) don't match, the router backtracks to the top-level routes, so the top-level `**` catches `/dashboard/...` and `/dashboard/boards/:id/...` too. The `DashboardComponent` guards don't run for an unmatched URL, because guards run only after a full match.

The checks mirror `authGuard` and `teamGuard`, so a redirect to Dashboard Home or Team selection passes their guards, and `featureGuard` doesn't apply to Home.

## 2.3 Decisions

1. **What should an unknown URL do?** Session-aware redirect: Login, Team selection or Dashboard Home. It reuses existing screens and the guards' own checks. Rejected: a not-found page (new component, phrases in every translation file, styles) and a plain redirect to `''` (sends logged-in users to Login).
2. **Toast on redirect?** No. Mistyped URLs are rare, and the toast container only exists inside the dashboard shell, so logged-out users wouldn't see it.
3. **Unknown sub-paths inside a board?** Same rule as any unknown URL, through the top-level wildcard. Rejected: a board-level wildcard to the Kanban tab (an extra route and a second rule).
4. **Where the redirect lives and its name:** `guards/unknown-route.redirect.ts`, `unknownRouteRedirect`, next to the guards whose checks it mirrors. `utils/` is for pure helpers, and this uses `inject`.
5. **Functional `redirectTo` rather than a guard on a `**` route:** a wildcard route needs a component or a redirect, and a `redirectTo` function returning a `UrlTree` needs neither a dummy component nor `router.navigate` side effects.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `npm test` in `frontend/` and note the spec count.

### A. Redirect

- [ ] A1. Create `frontend/src/app/guards/unknown-route.redirect.ts` with `unknownRouteRedirect` as described in 2.2, using `AppRoutes` (no string literals).
- [ ] A2. Add `frontend/src/app/guards/unknown-route.redirect.spec.ts` in the style of `feature.guard.spec.ts` (`TestBed.runInInjectionContext`, stubbed `AuthService` and `TeamService`, the real `Router` from `provideRouter([])`): logged out → `/login`; logged in without a team → `/team-selection`; logged in with a team → `/dashboard/home` (compare `router.serializeUrl` of the returned `UrlTree`).
- [ ] A3. Add `{path: '**', redirectTo: unknownRouteRedirect}` as the last entry of `routes` in `frontend/src/app/app/app.routes.ts`.

### Z. Wrap-up

- [ ] Z1. In `frontend/`: `npm test` (baseline plus the new specs, all passing) and `npm run build` (within budgets).
- [ ] Z2. Manual check in the running app: logged in with a team, open `/dashboard/settings`, `/foo` and `/dashboard/boards/<id>/foo` and land on Dashboard Home with no console error; open `/settings` and a real board URL and confirm they still work; log out, open `/foo` and land on Login.
