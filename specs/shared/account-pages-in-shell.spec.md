# Account pages in the dashboard shell — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

Settings, Profile and Manage team open from the header's account menu, but they are top-level routes (`/settings`, `/profile`, `/manage-team`) outside the dashboard. They render as a floating card on the bare page backdrop with a fixed "Back to dashboard" button in the corner. Opening one drops the header, sidebar, search and project selector, so the user loses their place and has to come back through a single exit. Every other screen (Home, Projects, Trash, boards) lives inside the shell.

This feature renders Settings, Profile and Manage team inside the dashboard shell as dashboard child routes (`/dashboard/settings`, `/dashboard/profile`, `/dashboard/manage-team`), laid out like the other dashboard screens, without the "Back to dashboard" button. Team selection and Switch team stay standalone.

- **Users:** every team member (Settings, Profile); team admins and the owner (Manage team).
- **Usage:**
  - The account menu items Profile, Settings and Manage team open the screen in the content area; header and sidebar stay visible and usable. No sidebar entry is highlighted, since these screens are not in the sidebar.
  - Each screen starts with its title in the same style as the other dashboard screens (the `dashboardStub__title` heading, as on Trash and Projects) and shows its content in a left-aligned column up to 640px wide, on the shell background rather than inside a floating card.
  - The "Back to dashboard" button is gone from these three screens. The user leaves through the sidebar, the header (search, account menu) or the browser Back button.
  - Unsaved changes in Settings and Profile still ask "Discard unsaved changes?" when the user navigates away, including through the sidebar, search results or the account menu.
  - Esc no longer leaves these screens (they are ordinary dashboard screens now, like Trash and Projects). Esc inside their dialogs still closes the dialog.
  - Old links and bookmarks to `/settings`, `/profile` and `/manage-team` redirect to the new URLs.
  - Deleting the team in Manage team, when the user has another team, reloads the app into that team's Home (as switching teams from a copied link already does). With no other team it goes to Team selection, as today.
  - Team selection (`/team-selection`), Create team, Join team and Switch team (`/switch-team`) stay standalone auth-card style screens with their "Back to dashboard" button.
- **Rules:**
  - Access is unchanged: the dashboard's `authGuard`, `teamLinkGuard` and `teamGuard` now cover all three; Manage team keeps `teamRoleGuard` (admin or owner), Settings and Profile keep `unsavedChangesGuard`.
  - The team's realtime `TeamChannel` subscription is owned by the dashboard alone. Manage team no longer opens or closes its own; it listens to the dashboard's (`TeamChannelService.membersChanged$`).
  - A team switch while the dashboard is open always goes through a full page reload, so the dashboard's channels, favorites and project filter load for the new team.
- **Out of scope:**
  - The internal structure of Manage team (sections, team code emphasis, storage wording, danger zone): `manage-team-structure`.
  - Settings toggles (`settings-switch-toggles`), the Language field in Settings and the header trigger (`responsive-dashboard-shell`), profile swatch names (`accessible-control-names`), error line styling (`announced-status-messages`), heading levels (`item-title-hierarchy`), button text casing (`ui-copy-consistency`).
  - Moving Team selection or Switch team into the shell (see Decisions).
  - Any backend change.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies. Angular router child routes, existing guards, `NavigationService.reloadAt`.

## 2.2 Structure

### Routes
- `frontend/src/app/app/app.routes.ts`: remove the `ManageTeamComponent`, `ProfileComponent` and `SettingsComponent` routes and imports (and `teamRoleGuard` / `unsavedChangesGuard` imports if no longer used there). Add redirects in their place, before the `DASHBOARD` entry: `` {path: AppRoutes.SETTINGS, redirectTo: `/${AppRoutes.DASHBOARD}/${AppRoutes.SETTINGS}`, pathMatch: 'full'} ``, and the same for `PROFILE` and `MANAGE_TEAM`. `SWITCH_TEAM` stays as it is.
- `frontend/src/app/app/dashboard.routes.ts`: add, next to `TRASH`,
  - `{path: AppRoutes.SETTINGS, component: SettingsComponent, canDeactivate: [unsavedChangesGuard]}`
  - `{path: AppRoutes.PROFILE, component: ProfileComponent, canDeactivate: [unsavedChangesGuard]}`
  - `{path: AppRoutes.MANAGE_TEAM, component: ManageTeamComponent, canActivate: [teamRoleGuard]}`
  - These components now live in the lazy dashboard chunk, which shrinks the initial bundle.
- `teamRoleGuard` keeps redirecting to `AppRoutes.DASHBOARD` (which redirects to Home).

### Header navigation (`components/dashboard-header/dashboard-header.component.ts`)
- `handleGoToProfile` → `navigate(AppRoutes.DASHBOARD, AppRoutes.PROFILE)`, `handleGoToSettings` → `navigate(AppRoutes.DASHBOARD, AppRoutes.SETTINGS)`, `handleGoToManageTeam` → `navigate(AppRoutes.DASHBOARD, AppRoutes.MANAGE_TEAM)`. `handleGoToTeams` (Team selection) is unchanged.

### Settings (`pages/dashboard/settings/`)
- Template: delete the `pageBackButton` button. Wrap the screen as `<div class="dashboardStub settings">` and make the title `<h2 class="dashboardStub__title settings__title">`.
- TS: remove `handleGoBack`, the Esc registration in `ngOnInit` (`unregisterEscape` and its call in `ngOnDestroy`), and the `EscapeService` and `NavigationService` constructor parameters and imports if nothing else uses them. Keep `ngOnInit` / `OnInit` only if something remains in it.
- CSS: `.settings` becomes the page column: `max-width: 640px;` only (drop `width`, `max-width: calc(...)`, `box-sizing`, `color`, `background`, `border-radius`, `box-shadow`, `padding`). `.settings__title` keeps only the bottom margin (`margin: 0 0 var(--space-5)`); size and weight come from `dashboardStub__title`.
- Update `settings.component.spec.ts` for the new constructor.

### Profile (`pages/dashboard/profile/`)
- Same treatment: delete the back button, wrap as `<div class="dashboardStub profile">`, title `<h2 class="dashboardStub__title profile__title">`, remove `handleGoBack` and the Esc registration and `EscapeService` (keep `NavigationService`, used after account deletion). `.profile` becomes `max-width: 640px;` only; `.profile__title` keeps only its margin.
- Update `profile.component.spec.ts` for the new constructor.

### Manage team (`pages/manage-team/`, files stay in this folder)
- Template: delete the `pageBackButton` button; the root becomes `<div class="dashboardStub manageTeam">`, the title `<h2 class="dashboardStub__title manageTeam__title">`. Leave the sections inside untouched.
- TS:
  - Remove `handleGoBack`, the Esc registration and the `EscapeService` parameter.
  - Remove `this.teamChannelService.connect(this.teamCode)` from `ngOnInit` and `this.teamChannelService.disconnect()` from `ngOnDestroy`. `TeamChannelService` is a single root subscription; inside the shell, Manage team's `disconnect()` on leaving would kill the dashboard's subscription (features, member removal, members changed) for the rest of the session. Keep the `membersChanged$` subscription.
  - `handleConfirmDeleteTeam`: when `fetchMyTeam()` returns a team, call `` this.navigationService.reloadAt(`/${AppRoutes.DASHBOARD}/${AppRoutes.DASHBOARD_HOME}`) `` instead of `navigate(AppRoutes.DASHBOARD)`, because the dashboard component stays alive across child routes and would keep the deleted team's channels and state. With no team, keep `navigate(AppRoutes.TEAM_SELECTION)` (that leaves the dashboard and tears it down).
- CSS: `.manageTeam` becomes `max-width: 640px;` only; `.manageTeam__title` keeps only its margin. Leave the other rules and the `max-width: 480px` media query.
- Update `manage-team.component.spec.ts`: drop `escapeServiceStub()` from the `new ManageTeamComponent(...)` calls and the TestBed providers as needed.
- Files are not moved to `pages/dashboard/` (see Decisions).

### Shared styles
- `styles.css` `.pageBackButton` stays: Team selection and Switch team still use it. `PHRASES.BACK_TO_DASHBOARD` stays for the same reason.

### Parallel work
These specs are implemented at the same time on other branches:
- **responsive-dashboard-shell** also edits `dashboard-header.component.*` and `settings.component.*`. It changes the header template, CSS, inputs/outputs and imports, and adds a Language field inside `section.settings__appearance` plus a `.settings__hint` rule. This spec only changes the navigate arguments inside `handleGoToProfile`, `handleGoToSettings` and `handleGoToManageTeam`, and in Settings only the back button, the root wrapper and title classes, the `.settings` / `.settings__title` rules and the Esc/back code. Do not touch the header template or the Appearance section here.
- **manage-team-structure** restructures the Manage team template and CSS into sections. This spec only removes the back button (first four lines), changes the root `div` and title classes, trims `.manageTeam` / `.manageTeam__title`, and edits `ngOnInit`, `ngOnDestroy`, `handleGoBack`, `handleConfirmDeleteTeam` and the constructor. Whoever merges second keeps both: the new sections inside a `dashboardStub manageTeam` root without a back button, no own `TeamChannel` connect/disconnect, and the reload on team delete.
- **settings-switch-toggles** replaces the Settings and Manage team feature checkboxes; no overlap with the lines above.
- **accessible-control-names** edits the Profile colour swatches; this spec does not touch them.
- **announced-status-messages** changes the `.authStatus` lines in Profile and Manage team; leave them untouched.
- **item-title-hierarchy** may turn screen titles into `h1`; this spec keeps `h2.dashboardStub__title` like the sibling screens so that spec can change all dashboard screens in one place.
- **ui-copy-consistency** changes button casing and copy; no overlap.

## 2.3 Decisions
1. **Settings, Profile and Manage team become dashboard child routes** (2026-11-04). Reason: Nielsen #3 user control and #4 consistency (every other screen keeps header and sidebar; these three were the exception, with a single forced exit); Impeccable operate.md "Standard navigation patterns: top bar + side nav" and "consistency over surprise". Rejected: keeping them standalone with a better back button (still loses search, navigation and context).
2. **URLs `/dashboard/settings`, `/dashboard/profile`, `/dashboard/manage-team`, reusing the existing `AppRoutes` values** (2026-11-04). Reason: matches the dashboard URL scheme; no new enum names. Old top-level URLs redirect so bookmarks keep working (Nielsen #5 error prevention); without them `unknownRouteRedirect` would silently drop the user on Home.
3. **Team selection, Create/Join team and Switch team stay standalone** (2026-11-04). Reason: Team selection must work before the user has any team (after register, after removal), so it cannot sit in a team-scoped shell; Switch team is only reached from Team selection and changes the team the shell would be showing. Keeping the whole team flow in one auth-card style keeps it consistent (Nielsen #4). Rejected: Switch team in the shell (it would render inside the old team's shell and need a reload on every switch anyway).
4. **No "Back to dashboard" button on the three screens** (2026-11-04). Reason: the sidebar and browser Back are the exits, as on every dashboard screen; a back button inside the shell duplicates navigation (Impeccable distill/quieter: remove what does not serve the task).
5. **Esc no longer navigates away from these screens** (2026-11-04). Reason: no other dashboard screen leaves on Esc (Trash, Projects, Home), so keeping it would be inconsistent (Nielsen #4), and an Esc meant to clear a field or close an autocomplete could navigate away from a form. Dialogs on these screens keep their own Esc. Rejected: Esc → Home.
6. **Layout: page column up to 640px on the shell background, no floating card** (2026-11-04). Reason: Impeccable craft-floor "Cards are the lazy container"; other dashboard screens (Trash, Projects) render directly on the shell with `dashboardStub`; 640px keeps form fields at a readable measure (layout.md density for forms). Rejected: keeping the 560px card centred in the content area (a card inside the shell reads as a modal and is inconsistent with sibling screens).
7. **Manage team drops its own `TeamChannel` connection** (2026-11-04). Reason: `TeamChannelService` holds one subscription; Manage team's `disconnect()` on destroy would cut the dashboard's live updates once it lives inside the shell. The dashboard already connects for the active team.
8. **Deleting the team reloads into the next team's Home** (2026-11-04). Reason: the dashboard component now survives the navigation, so a plain router navigation would keep the deleted team's channels, favorites and project filter; the project already handles a team switch inside the dashboard with `NavigationService.reloadAt` (`teamLinkGuard`).
9. **Manage team files stay in `pages/manage-team/`** (2026-11-04). Reason: `manage-team-structure` rewrites the same files in parallel; moving them at the same time would turn every change into a rename conflict. Routes import the component from its current path.

### Decisions to double-check
- **Esc behaviour removed** from Settings, Profile and Manage team (2026-11-04). `CLAUDE.md` currently lists them as pages that go back on Esc; this changes documented behaviour.
- **Manage team folder not moved under `pages/dashboard/`** (2026-11-04), which leaves it outside the "dashboard/ holds the child routes" structure rule. A later cleanup can move it once `manage-team-structure` is merged.
- **Team delete with a remaining team now does a full page reload** (2026-11-04) instead of a router navigation.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Routes
- [ ] A1. `frontend/src/app/app/dashboard.routes.ts`: add the Settings, Profile and Manage team child routes with their guards (Part 2.2). `frontend/src/app/app/app.routes.ts`: replace the three top-level routes with `redirectTo` entries to the new URLs and remove unused imports.
- [ ] A2. Add `frontend/src/app/app/dashboard.routes.spec.ts`: Settings and Profile routes carry `unsavedChangesGuard` in `canDeactivate`, Manage team carries `teamRoleGuard` in `canActivate`. Add `frontend/src/app/app/app.routes.spec.ts` (or extend an existing routes spec if one appears): `/settings`, `/profile` and `/manage-team` redirect to `/dashboard/...`, and `switch-team` is still a top-level route.
- [ ] A3. `components/dashboard-header/dashboard-header.component.ts`: change the three `handleGoTo*` navigate arguments. Add tests to `dashboard-header.component.spec.ts` with a `NavigationService` spy that `handleGoToSettings`, `handleGoToProfile` and `handleGoToManageTeam` navigate to `(DASHBOARD, SETTINGS)`, `(DASHBOARD, PROFILE)` and `(DASHBOARD, MANAGE_TEAM)`, and that `handleGoToTeams` still goes to `TEAM_SELECTION`.

### B. Screens
- [ ] B1. Settings: remove back button, Esc registration, `handleGoBack` and unused constructor parameters; apply the `dashboardStub` wrapper and title classes; trim `.settings` / `.settings__title`. Update `settings.component.spec.ts` constructors.
- [ ] B2. Profile: same as B1 (keep `NavigationService`). Update `profile.component.spec.ts` constructors.
- [ ] B3. Manage team: remove back button, Esc registration, `handleGoBack`, `EscapeService`, and the `teamChannelService.connect` / `disconnect` calls; apply the wrapper and title classes; trim `.manageTeam` / `.manageTeam__title`. Update `manage-team.component.spec.ts`.
- [ ] B4. Manage team `handleConfirmDeleteTeam`: reload to `/dashboard/home` with `reloadAt` when another team is returned, keep `navigate(TEAM_SELECTION)` otherwise. Add tests in `manage-team.component.spec.ts`: `ngOnInit` does not call `teamChannelService.connect`, `ngOnDestroy` does not call `disconnect`, a `membersChanged$` emission still reloads members, and confirming delete calls `reloadAt('/dashboard/home')` when `fetchMyTeam` resolves a team and `navigate(TEAM_SELECTION)` when it resolves null.

### Z. Wrap-up
- [ ] Z1. Update the root `CLAUDE.md`: in "App and routing" say Settings, Profile and Manage team are dashboard child routes (with the old URLs redirecting) while the auth and team-flow pages (including Switch team) stay top-level; in the Esc paragraph remove Settings, Profile and Manage team from the pages that go back on Esc; in the `TeamChannelService` sentence drop "(and from Manage team, which sits outside it)"; mention that a team delete with a remaining team reloads like `teamLinkGuard`.
- [ ] Z2. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test`, `npm run build` in `frontend/`).
- [ ] Z3. Manual check in the running app: open Profile, Settings and Manage team (as owner) from the account menu and see header and sidebar stay; change a setting and click a sidebar link, get the discard prompt; Esc does nothing on the screen but closes the discard prompt; open `/settings` directly and land on `/dashboard/settings`; log in as a plain member and open `/dashboard/manage-team`, get sent Home; on Manage team, have a second browser change a member's role and see the list update, then leave Manage team and toggle a feature from the second browser and see the sidebar follow (the dashboard's channel survived); delete a team while having another and land on the other team's Home after a reload; Team selection and Switch team still show their Back to dashboard button.
