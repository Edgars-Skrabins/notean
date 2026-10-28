# Copy link — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-28

# Part 1 — Business logic and usage

People want to point a teammate at a page, diagram, board, ticket or project by pasting a link into chat or email. Today the app's URLs (`/dashboard/pages/42`) don't say which team they belong to, because the active team lives in `localStorage`. Opening such a URL while another team is active, or while logged out, fails or shows an empty popup.

This feature adds a **Copy link** button to each item's detail screen. The copied link carries the team, so it opens the right item for anyone who already has access: it logs them in first if needed and switches their active team if needed. It is **not** a public share link: it grants nothing. Everyone else gets one neutral "not available" screen that never reveals the item's title or whether it exists.

- **Users:** any team member looking at an item they can see; anyone who receives a copied link.
- **Usage (copying):**
  1. On a page or diagram popup (view mode), the board page, the ticket popup or the project detail page, the user clicks the link icon button in the header (tooltip "Copy link").
  2. The link to the screen they are on is copied to the clipboard and a success toast "Link copied" appears. If the clipboard write fails, an error toast "Couldn't copy the link" appears.
  3. The link is the current screen's URL plus the active team: e.g. `http://localhost:4200/dashboard/pages/42?team=AB12CD`. A board link keeps the tab it was copied on (`/overview`, `/kanban` or `/list`); a ticket link keeps the tab its popup was opened from (`…/kanban/tickets/7` or `…/list/tickets/7`). Any other query params on the current URL are dropped.
- **Usage (opening a link):**
  1. **Logged out:** the person lands on Login. After logging in they continue straight to the link (team switch included). If they switch to Register instead, Register keeps the link only so that going back to Login still continues to it; after registering they go to Team selection as today and the link is dropped.
  2. **Logged in, link's team is the active team:** the item opens; the `team` param is removed from the address bar.
  3. **Logged in, link's team is another team they belong to:** the active team switches to it (as Switch team does), then the item opens without the `team` param.
  4. **Not a member of the link's team (or the team doesn't exist):** the "not available" screen. The active team is unchanged.
  5. **Member, but the item is in a project they can't see, was deleted, or is in the trash:** the "not available" screen.
  6. **Member, but the item's feature (pages, diagrams or boards) is turned off in that team:** they land on Home with the existing info toast "This feature was turned off by the team owner".
- **The "not available" screen:** a standalone page at `/unavailable` (outside the dashboard shell) with the title "Not available", the text "This item doesn't exist, or you don't have access to it." and a **Go home** button that goes to the Dashboard Home, or to Team selection when the user has no active team. It never shows the item's title, type of failure or team name.
- **Rules:**
  - Access is decided entirely by the existing checks: `authGuard`, team membership (`POST /teams/:code/activate` answers 403 `NOT_TEAM_MEMBER` or 404 `TEAM_NOT_FOUND`), `featureGuard`, and the API's project visibility (`ProjectAccess` 404s hidden items). No backend change, no new token, no public access.
  - Any item screen whose **first load** answers its `*_NOT_FOUND` code goes to the "not available" screen, whether it was opened from a link or from inside the app. Errors after the first load (saves, deletes, live updates) keep today's alerts and toasts.
  - Only in-app paths are accepted as a post-login target (must start with `/`, must not start with `//`), so the login redirect can't send anyone off-site.
- **Out of scope:**
  - Public or guest share links: explicitly not this feature.
  - Copy link on folders (no screen of their own), on list rows, tree rows or Kanban cards (headers only, by decision).
  - Continuing to the link after Register and joining a team: a brand-new account can't be a member yet.
  - Keeping the link when a session expires mid-use (the 401 handler still goes to plain Login).
  - Any "in trash" notice or restore flow for trashed items: owned by the trash spec.

### How this touches the sibling specs
- **Trash:** trashed items must answer their `*_NOT_FOUND` code on show (as the trash spec plans), so links to them land on "not available". Nothing in this spec needs to change for that.
- **Mentions / notifications inbox / comments:** links they render to items can reuse the same `?team=<code>` param and `teamLinkGuard` (for example inbox entries from another team); links within the active team can keep using plain routes.
- **Templates, attachments, chat:** no interaction. If chat or templates get their own detail screens later, they can add the same header button.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies. Uses the Angular router (guards, `UrlTree`), the browser Clipboard API (`navigator.clipboard.writeText`, already used by `TeamCodeDisplayComponent`), the existing `ToastService`, `TeamService.activateTeam`, `AuthCardComponent`, `IconButtonComponent` and ngx-translate.

## 2.2 Structure

### Backend
No changes. All access rules already exist: `POST /teams/:code/activate` (membership), `require_feature!`, and `project_access.scope(...)` in `set_<resource>` (404 for hidden items).

### Routing
- `AppRoutes` gets `UNAVAILABLE = 'unavailable'`.
- `app.routes.ts`: new top-level route `{path: AppRoutes.UNAVAILABLE, component: UnavailableComponent, canActivate: [authGuard]}`, placed before the `**` entry.
- The `dashboard` route becomes `canActivate: [authGuard, teamLinkGuard, teamGuard]` with `runGuardsAndResolvers: 'always'`, so the guard also runs when a link is followed inside the app (query params alone don't re-run parent guards by default).

### Guards
- `authGuard` (`guards/auth.guard.ts`): when not authenticated, navigate to Login with `queryParams: {returnUrl: state.url}` instead of plain Login.
- New `teamLinkGuard` (`guards/team-link.guard.ts`), a functional `CanActivateFn`:
  - No `team` query param → `true`.
  - Builds the clean URL: `router.parseUrl(state.url)` with `queryParams.team` deleted.
  - `team` equals the current team code → return the clean `UrlTree`.
  - Otherwise `await teamService.activateTeam(code)` (which already stores team, role and nickname through `applyTeamResponse`):
    - Failure (any code) → return `UrlTree` for `/unavailable`.
    - Success and the router's current URL (`router.url`) is already inside `/dashboard` → `window.location.assign(cleanUrl)` and return `false`, so the dashboard shell, its channels and the project filter restart for the new team.
    - Success otherwise → return the clean `UrlTree`.
- `featureGuard` (`guards/feature.guard.ts`): when it redirects to Home, also show `ToastService.show({type: ToastType.INFO, message: PHRASES.FEATURE_TURNED_OFF})`.

### Login and Register
- `LoginComponent`: reads `returnUrl` from the query params. After a successful login and `sessionService.load()`, if `returnUrl` is a safe in-app path (`isSafeReturnUrl` from new `@utils/returnUrl`: starts with `/`, not `//`), `router.navigateByUrl(returnUrl)`; otherwise the existing Dashboard / Team selection choice. The "go to register" action passes `returnUrl` along.
- `RegisterComponent`: keeps `returnUrl` from its query params only to pass it back on its "go to login" action. After registering, it navigates as today and ignores `returnUrl`.

### Copying
- New `CopyLinkService` (`services/copy-link.service.ts`, `providedIn: 'root'`) with `copyCurrentLink(): Promise<void>`:
  - Builds `window.location.origin + router.serializeUrl(tree)` where `tree = router.parseUrl(router.url)` with `queryParams` replaced by `{team: teamService.getCurrentTeamCode()}` and the fragment cleared.
  - `navigator.clipboard.writeText(link)` → success toast `PHRASES.LINK_COPIED`; rejection → error toast `PHRASES.LINK_COPY_FAILED`.
- `IconComponent` gets a new `link` icon (chain link, same stroke style as the others).
- Header buttons, each `<app-icon-button icon="link" [tooltip]="PHRASES.COPY_LINK | translate" (pressed)="…">` (the tooltip input also sets the `aria-label`):
  - `ItemDetailLayoutComponent` (pages and diagrams): in the view-mode actions next to the favourite star; emits a new `copyLinkRequested` output, handled in `FolderedItemDetailComponent` base by calling `CopyLinkService.copyCurrentLink()`.
  - `BoardPageComponent` header, next to the existing icon buttons.
  - `TicketDetailComponent` header, before the close button.
  - `ProjectDetailComponent` header, next to Settings (shown to everyone who can see the project, not only managers).

### Not-available screen
- New `UnavailableComponent` (`pages/unavailable/`), built like `TeamSelectionComponent`: `<app-auth-card [title]="PHRASES.ITEM_UNAVAILABLE_TITLE | translate" [subtitle]="PHRASES.ITEM_UNAVAILABLE_TEXT | translate">` with one `authButton` **Go home** (`PHRASES.GO_HOME`) → `AppRoutes.DASHBOARD` when `teamService.getCurrentTeam()` is set, else `AppRoutes.TEAM_SELECTION`.

### First-load redirects
Each screen navigates with `router.navigate([AppRoutes.UNAVAILABLE], {replaceUrl: true})` when its first load fails with its not-found code; any other error keeps the current alert:
- `FolderedItemDetailComponent.loadItem()` (pages and diagrams): `PAGE_NOT_FOUND` / `DIAGRAM_NOT_FOUND` (the subclass supplies its code, alongside its existing per-type config).
- `BoardPageComponent` after `state.load(...)`: `BOARD_NOT_FOUND`. (The live `access_changed` → `BOARD_NOT_FOUND` path keeps going Home with a toast.)
- `TicketDetailComponent.loadTicket()`: `TICKET_NOT_FOUND` on the first load only (a ticket deleted while open keeps today's toast and close).
- `ProjectDetailComponent.ngOnInit` `getProject`: `PROJECT_NOT_FOUND`.

### i18n
New `PHRASES` keys and entries in all 11 translation files: `COPY_LINK` ("Copy link"), `LINK_COPIED` ("Link copied"), `LINK_COPY_FAILED` ("Couldn't copy the link"), `ITEM_UNAVAILABLE_TITLE` ("Not available"), `ITEM_UNAVAILABLE_TEXT` ("This item doesn't exist, or you don't have access to it."), `GO_HOME` ("Go home").

## 2.3 Decisions
1. **Which items:** pages, diagrams, boards, tickets and projects. Folders are left out: they have no screen of their own.
2. **Placement:** only in each item's detail header. Rejected: hover icons on tree rows, List rows and Kanban cards (rows are already crowded and near their style budgets).
3. **URL shape:** the normal app URL plus `?team=<code>`, resolved by a guard that switches the active team and drops the param. Rejected: a dedicated `/link/:team/:type/:id` resolver route (extra route and screen), and moving the dashboard under `/t/:teamCode/...` (rewrites all routing; far bigger than this feature). The team code is only half of the join credential (join also needs the password), so exposing it in links is acceptable.
4. **Toast:** success toast on copy, error toast if the clipboard write fails. Rejected: an inline check-mark state on the button.
5. **Logged out:** Login keeps `returnUrl` and continues to the link after login. Rejected: plain login to Home (the link is lost).
6. **Register:** the link is dropped after registering (Register only hands it back to Login). Rejected: carrying it through Team selection and Join team (three more screens for a case that would end on "not available" anyway).
7. **No project access / deleted / trashed:** one shared neutral "not available" screen with Go home, never the title. Rejected: today's empty popup with an alert; Home with a toast; an "in trash" notice (couples to the trash spec's API).
8. **Non-member or unknown team:** the same "not available" screen; the active team is unchanged. Rejected: a "not a member" toast, which reveals that the team exists.
9. **Feature turned off:** the existing `featureGuard` redirect to Home, now with the existing `FEATURE_TURNED_OFF` toast. Rejected: the "not available" screen.
10. **Where the screen lives:** a top-level `/unavailable` route behind `authGuard` only, outside the dashboard shell, so it works for non-members and users without an active team. Rejected: `/dashboard/unavailable` (needs an active team).
11. **When the screen shows:** any first-load `*_NOT_FOUND` on the item screens, link or not. Rejected: only for links opened with `?team=` (would need to remember the link's origin past the guard).
12. **Ticket and board links keep the current tab:** copy uses the current URL, so a ticket link opens in the tab it was copied from and a board link on the current tab. Rejected: always Kanban.
13. **Switching team while already in the dashboard** (a link clicked inside the app) does a full page load of the clean URL, so `DashboardComponent`, `TeamChannelService`, `ProjectFilterService` and the other per-team state start fresh. A switch on a fresh load just redirects.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `npm test` in `frontend/` and `bin/rails test` in `backend/` and note the counts here.

### A. Shared building blocks
- [ ] A1. Add the `PHRASES` keys from 2.2 i18n to `config/phrases.ts` and translate them in every file in `public/assets/translations/` (en, lv, et, lt, ru, sv, fi, de, da, fr, es).
- [ ] A2. Add the `link` icon to `components/icon/` in the same style as the existing icons.
- [ ] A3. Add `utils/returnUrl.ts` with `isSafeReturnUrl(url: string | null): url is string` (true only for strings starting with `/` and not `//`), with a spec covering `null`, `/dashboard/pages/1?team=X`, `//evil.com`, `https://evil.com` and `dashboard`.
- [ ] A4. Add `CopyLinkService` (`services/copy-link.service.ts`) as in 2.2, with a spec: the copied text is origin + current path with only `team=<current code>` (other query params and fragment dropped; board and ticket tab paths kept), success toast on resolve, error toast on reject.

### B. Routing and guards
- [ ] B1. Add `AppRoutes.UNAVAILABLE` and `UnavailableComponent` (`pages/unavailable/`, `npm run newcomponent`), using `AuthCardComponent` and the Go home logic from 2.2; register the route in `app.routes.ts` before `**`. Spec: Go home goes to Dashboard with an active team, to Team selection without one.
- [ ] B2. `authGuard`: redirect to Login with `returnUrl: state.url`. Add `guards/auth.guard.spec.ts` (authenticated passes; logged out navigates to Login with the return URL).
- [ ] B3. Add `teamLinkGuard` (`guards/team-link.guard.ts`) as in 2.2 and wire it on the `dashboard` route between `authGuard` and `teamGuard`, with `runGuardsAndResolvers: 'always'`. Spec: no param passes; same team returns the clean URL; other team activates then returns the clean URL; activation failure returns `/unavailable` and leaves the team unchanged; success while `router.url` is in `/dashboard` calls `window.location.assign` (inject or wrap it so the spec can stub it) and returns `false`.
- [ ] B4. `featureGuard`: show the `FEATURE_TURNED_OFF` info toast on redirect; extend `feature.guard.spec.ts` (provide a `ToastService` spy; toast on redirect, none when allowed).

### C. Login and Register
- [ ] C1. `LoginComponent`: after login and `sessionService.load()`, `navigateByUrl(returnUrl)` when `isSafeReturnUrl`, else the existing navigation; pass `returnUrl` on "go to register". Add or extend its spec for both paths and an unsafe `returnUrl`.
- [ ] C2. `RegisterComponent`: pass a received `returnUrl` back on "go to login"; registering still navigates as today.

### D. Copy link buttons
- [ ] D1. `ItemDetailLayoutComponent`: link icon button in the view-mode actions next to the favourite star, emitting `copyLinkRequested`; `FolderedItemDetailComponent` base (and the page and diagram templates that bind the layout) call `CopyLinkService.copyCurrentLink()`.
- [ ] D2. `BoardPageComponent` header: link icon button calling `copyCurrentLink()`.
- [ ] D3. `TicketDetailComponent` header: link icon button before close, calling `copyCurrentLink()`.
- [ ] D4. `ProjectDetailComponent` header: link icon button next to Settings, visible to every viewer.
- [ ] D5. Update the existing specs of these components broken by the new injected service (add a `CopyLinkService` stub) and check each component's CSS stays within the style budget.

### E. First-load redirects to "not available"
- [ ] E1. `FolderedItemDetailComponent.loadItem()`: on the first load's `PAGE_NOT_FOUND` / `DIAGRAM_NOT_FOUND` navigate to `/unavailable` with `replaceUrl`; other errors keep the alert. Extend `page-detail.component.spec.ts` (and the diagram one if present) for both.
- [ ] E2. `BoardPageComponent`: after the first `state.load`, `BOARD_NOT_FOUND` → `/unavailable`; leave the live `access_changed` handling as is. Spec it.
- [ ] E3. `TicketDetailComponent.loadTicket()`: first-load `TICKET_NOT_FOUND` → `/unavailable`; a ticket removed later keeps today's toast and close. Spec it.
- [ ] E4. `ProjectDetailComponent`: `PROJECT_NOT_FOUND` from `getProject` → `/unavailable`. Spec it.

### Z. Wrap-up
- [ ] Z1. Update the root `CLAUDE.md`: the `/unavailable` route and `teamLinkGuard` in "App and routing", `authGuard`'s `returnUrl`, `CopyLinkService` and the `?team=` link convention in "Services and HTTP".
- [ ] Z2. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test`, `npm run build` in `frontend/`; `bin/rails test`, `bin/rubocop` in `backend/`).
- [ ] Z3. Manual check in the running app with two users and two teams: copy a page, diagram, board (each tab), ticket (Kanban and List) and project link and see the toast; open each link logged out (login, then lands on it), in the other active team (switches and opens), as a non-member and as a member without project access ("not available", no title shown), with the feature off (Home with toast), and from inside the app while another team is active (full reload into the right team).
