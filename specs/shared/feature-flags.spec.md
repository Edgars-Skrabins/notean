# Team feature flags — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

A team owner can switch the Pages, Diagrams and Boards features off or on for the whole team. A disabled feature disappears from the app for everyone in the team, and the API refuses or leaves out its data. Nothing is deleted: turning a feature back on brings everything back as it was.

- **Users:**
  - The team owner manages the flags.
  - Every team member is affected by them.
- **Usage:**
  - **Managing:**
    - Manage team gets a **Features** section, visible only to the team owner (admins don't see it).
    - It has three toggles: Pages, Diagrams and Boards. All are on by default.
    - A toggle saves immediately and shows a success toast, or an error toast that reverts the toggle.
  - **When a feature is off,** for every member of the team:
    - The sidebar entry disappears (Pages, Diagrams, or the Boards section with its board list and "Create board").
    - Its routes are blocked: opening a URL of a disabled feature redirects to Home.
    - **Favorites** (Home grid and sidebar list) leave out items of that type. With Boards off, ticket favorites are left out too.
    - **My Work** shows nothing when Boards is off (it only lists tickets). With Boards off, Home hides the My Work block.
    - **Global search** leaves out that type's section. With Boards off, tickets are left out too.
    - **The project page** (`projects-redesign.spec.md`) hides that type's group.
  - **Live update:** when the owner changes a flag, every open session in that team updates immediately. Sidebar entries appear or disappear, and a member currently on a disabled feature's screen or popup is sent to Home with an info toast: "This feature was turned off by the team owner".
- **Rules:**
  - Only the team owner can change flags. Anyone else gets 403.
  - For a disabled feature, every endpoint of that type returns 403 `FEATURE_DISABLED`:
    - Pages: pages
    - Diagrams: diagrams
    - Boards: boards, columns, tickets, ticket assignees, and the bulk ticket and priority endpoints once they exist
    - Folders of a disabled item type
  - Endpoints that aggregate (favorites, My Work, search) don't error. They leave the disabled types out.
  - Data is never deleted or changed by a flag.
  - The ActionCable editing channels for pages and diagrams reject subscriptions while their feature is off.
- **Out of scope:**
  - Flags for Projects.
  - Per-user or per-project flags.
  - Plan or billing limits.

# Part 2 — Technical details

## 2.1 Tools and libraries
Rails migration, ActionCable (new team channel), Angular guards and services, `@rails/actioncable` on the frontend. No new dependencies.

## 2.2 Structure

### Backend

**Migration:** add `pages_enabled`, `diagrams_enabled` and `boards_enabled` to `teams` (boolean, `default: true`, `null: false`). `team_json` already serialises all columns except the password ones, so the flags appear in every team JSON, including `GET /users/me`'s active team.

**`Team#feature_enabled?(feature)`** for `:pages`, `:diagrams` and `:boards`. `FEATURES = %w[pages diagrams boards]`.

**Concern `app/controllers/concerns/feature_gated.rb`:**
- `require_feature!(feature)` renders `ErrorCodes::Teams::FEATURE_DISABLED` with 403 unless `@team.feature_enabled?(feature)`.
- Controllers declare it after `set_team`:
  - `PagesController` → `:pages`
  - `DiagramsController` → `:diagrams`
  - `BoardsController`, `ColumnsController`, `TicketsController`, `TicketAssigneesController` → `:boards`
  - `FoldersController` checks the folder's or requested `item_type` (pages → `:pages`, diagrams → `:diagrams`)

**Aggregates:**
- `FavoritesController#index` filters out favoritable types whose feature is off (`Board` and `Ticket` → boards, `Page` → pages, `Diagram` → diagrams).
- `MyWorkController#index` returns an empty list when boards are off.
- `SearchController` skips the disabled sections (and rejects `type=` of a disabled type with `FEATURE_DISABLED`).

**Route:** `patch "teams/:code/features" => "teams#update_features"`.
- `TeamsController#update_features`: `require_team_role!(@team, :owner)`.
- Permits `pages_enabled`, `diagrams_enabled` and `boards_enabled` (via `update_team_features_params` in `ApplicationController`).
- Responds `{ team: team_json(@team) }`.
- Broadcasts `{ type: "features_changed", team: team_json(@team) }` on `TeamChannel`.

**`app/channels/team_channel.rb`:**
- Subscribes with `team_code`.
- Rejects non-members.
- Streams `TeamChannel.stream_name(team)` (`"team:#{team.id}"`).

**Editing channels:** `EditingChannel#subscribed` also rejects when the item's feature is off.

**Error code:** `FEATURE_DISABLED` in `ErrorCodes::Teams`.

**Tests:**
- `teams_controller_test.rb`: owner can toggle, admin and user get 403, and the broadcast happens (`assert_broadcast_on`).
- Each gated controller returns 403 when off and works when on.
- Folders by item type.
- Favorites, My Work and search exclude disabled types.
- `team_channel_test.rb`: members subscribe and non-members are rejected.
- An editing channel rejects when off.

### Frontend

**Model:**
- `Team` gets `pagesEnabled`, `diagramsEnabled` and `boardsEnabled`.
- Add a `TeamFeature` type (`'pages' | 'diagrams' | 'boards'`).

**`TeamService`:**
- `features$` (a `BehaviorSubject` derived from the current team)
- `isFeatureEnabled(feature)`
- `updateFeatures(teamCode, flags)`, which updates the stored team, re-emits and returns `Result`
- `applyFeatures(team)` for broadcasts

**`services/team-channel.service.ts`:**
- Opens the ActionCable consumer like the editing services and subscribes to `TeamChannel` for the current team.
- On `features_changed`, calls `teamService.applyFeatures`.
- Connected from `DashboardComponent` (connect on init and on team switch, disconnect on destroy).

**Guard `guards/feature.guard.ts`:** `featureGuard(feature)` returns a `CanActivateFn` that redirects to Home when disabled. Apply it in `app.routes.ts` to the pages, diagrams and boards routes (list and detail).

**Reacting live:**
- `DashboardComponent` (or `TeamChannelService`) subscribes to `features$`.
- If the current URL belongs to a now-disabled feature, it navigates to Home and shows the info toast.

**Hiding UI:**
- `dashboard-sidebar` hides the entries.
- `sidebar-boards` hides entirely, and `BoardListService` doesn't load boards when they're off.
- `home` hides My Work when boards are off.
- `favorites-grid` and `favorites-list` filter too, as a safety net for stale caches.
- `global-search` relies on the API.
- The project page hides groups (if `projects-redesign` is merged).

**Any `FEATURE_DISABLED` response:** `apiRequest` callers just show the error. Additionally, the axios instance (`config/axiosConfig`) reacts to a 403 with that code by reloading the session (`SessionService` loads `/users/me`), so stale flags fix themselves.

**Manage team (`pages/manage-team/`):** a Features section with three `app-checkbox` toggles, visible when `isOwner`. Saving uses `updateFeatures` with success and error toasts.

**Error code and phrases** (in `config/errorCodes/teams.ts` and every translation file):
- `ERRORS.TEAMS.FEATURE_DISABLED`
- `FEATURES` ("Features")
- `FEATURE_PAGES` ("Pages")
- `FEATURE_DIAGRAMS` ("Diagrams")
- `FEATURE_BOARDS` ("Boards")
- `FEATURES_UPDATED` ("Features updated")
- `FEATURE_TURNED_OFF` ("This feature was turned off by the team owner")

## 2.3 Decisions
1. **Where:** a Features section on Manage team, owner only. A separate settings page was rejected.
2. **API for a disabled feature:** 403 `FEATURE_DISABLED`. Aggregates silently leave the type out. 404 was rejected because it can't be told apart from a deleted item.
3. **Live updates:** over a new ActionCable `TeamChannel`. Only reloading on the next load was rejected.
4. **Hidden data:** left out everywhere (favorites, My Work, search, project page). Data is kept.
5. **Storage:** three boolean columns on `teams`. A `team_features` table was rejected as unnecessary for three fixed flags.
6. **Tickets follow Boards:** they have no flag of their own. (Follows from boards owning tickets.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Overlaps with other specs:**
- `projects-redesign.spec.md`: if merged, hide the project page groups here. If it's in progress, stop and ask the user.
- `board-list-tab.spec.md` and `ticket-priorities.spec.md` add board endpoints that must also be gated by `:boards`. Whichever lands second gates the other's endpoints. If one is in progress, stop and ask the user who adds the gate.
- `radius-and-spacing.spec.md` touches `manage-team` CSS.

Baseline before starting: run `npm test` in `frontend/` and `bin/rails test` in `backend/`, and note the counts here.

### A. Data model
- [ ] A1. Add the migration for the three flags, run `bin/rails db:migrate`, and add `Team#feature_enabled?` with a model test.

### B. Enforcement (backend)
- [ ] B1. Add `ErrorCodes::Teams::FEATURE_DISABLED` and the `FeatureGated` concern, and gate the pages, diagrams, boards, columns, tickets and ticket assignees controllers. Add controller tests for each (403 when off).
- [ ] B2. Gate `FoldersController` by item type, with tests.
- [ ] B3. Filter favorites, My Work and search, with tests.
- [ ] B4. Make the editing channels reject when the feature is off, with a channel test.

### C. Managing and broadcasting (backend)
- [ ] C1. Add `TeamChannel` with a channel test.
- [ ] C2. Add the `update_features` route, strong params and action with the broadcast, and tests (owner only, broadcast sent).
- [ ] C3. Run `bin/rubocop` and `bin/brakeman`.

### D. Frontend data and live updates
- [ ] D1. Add the flags to the `Team` model, add `features$`, `isFeatureEnabled`, `updateFeatures` and `applyFeatures` to `TeamService`, and extend `team.service.spec.ts`.
- [ ] D2. Add `TeamChannelService` and connect it from `DashboardComponent`.
- [ ] D3. Add `featureGuard`, apply it to the routes, and add a guard test.
- [ ] D4. Redirect live to Home with the toast when the current feature is turned off.
- [ ] D5. Reload the session on a `FEATURE_DISABLED` 403 in `axiosConfig`.

### E. Frontend UI
- [ ] E1. Hide the sidebar entries, the boards section, Home's My Work and filtered favorites per flag. Extend the related specs (favorites, board list).
- [ ] E2. Add the Features section to Manage team with toasts, and a `manage-team.component.spec.ts` case that it is owner only and calls `updateFeatures`.
- [ ] E3. Add the error code and phrases to every translation file.

### Z. Wrap-up
- [ ] Z1. Run `bin/rails test`, `bin/rubocop` and `bin/brakeman` in `backend/`, and `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Update `CLAUDE.md`: feature flags on teams, `FeatureGated`, `TeamChannel`, `featureGuard` and `TeamChannelService`.
- [ ] Z3. Manual check in the running app with two browsers (the owner, and a member on a board):
  - The owner turns Boards off: the member is moved to Home with a toast, and the boards sidebar, ticket favorites, My Work and search tickets disappear.
  - A board URL redirects to Home.
  - Turning it back on restores everything.
  - The same for Pages and Diagrams.
  - An admin doesn't see the Features section.
