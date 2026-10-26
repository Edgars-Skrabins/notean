# Notean

## Project context

Notean is a team workspace app for documents, diagrams and kanban boards. This monorepo holds both halves of the app:

- `frontend/`: an Angular single-page app served at `http://localhost:4200`.
- `backend/`: a Rails API-only app served at `http://127.0.0.1:3000`.

The frontend talks to the API at `http://127.0.0.1:3000` (`apiUrl` in `frontend/src/environments/environment.ts`), and the API's CORS only allows `http://localhost:4200` (overridable with `FRONTEND_ORIGIN`). Both must be running for the app to work.

`backend/config/master.key` is committed on purpose for early dev convenience. It must be rotated and gitignored before any real deployment.

The dev and test database URLs in `backend/config/database.yml` (user and password `notean`, matching `docker-compose.yml`) are committed for the same reason. Before deploying, an env file must provide `DATABASE_URL` with real credentials. `DATABASE_URL` overrides the development database and `TEST_DATABASE_URL` the test database, so parallel worktrees can each use their own.

## Repository layout

```
notean/
├── CLAUDE.md
├── README.md
├── docker-compose.yml   PostgreSQL for development and tests
├── .claude/      Claude Code config (launch.json, skills/)
├── specs/        feature specs for the whole app
├── frontend/     Angular app
└── backend/      Rails API
```

Run frontend commands from `frontend/` and backend commands from `backend/`.

## Specs workflow

- Specs live in the root `specs/` folder and cover the whole feature, backend and frontend together.
- `specs/shared/` is committed. New specs go here.
- `specs/personal/` is gitignored. Only put something here when explicitly asked to.
- Before implementing a feature, read its spec if one exists.
- Specs are implemented with the project's `implement-notean-spec` skill (`.claude/skills/`), which follows the global `implement-spec` and adds Notean's branch, worktree and pull request rules.

## Branches and worktrees

- Sessions start in the main checkout on `master`. Several sessions share it, so never switch branches there and never change app code there. Questions, research and spec writing happen in the main checkout.
- Every spec is implemented on its own branch, created from an up-to-date `origin/master`, and worked on in a local worktree for that branch in `.claude/worktrees/<spec-name>`, so several agents can work in parallel. The `implement-notean-spec` skill creates both and moves the session into the worktree.
- Commits and pushes go to the spec's branch. The worktree stays local; only the branch is on GitHub.
- Finished work reaches `master` through a pull request from the branch, merged only once it is approved. Never commit to `master` directly, except new or updated specs and Claude config.
- Branch names are `feature/<spec-name>` for features and `fix/<spec-name>` for bug fixes, where `<spec-name>` is the spec's filename without `.spec.md` (e.g. `specs/shared/diagram-inspect.spec.md` → `feature/diagram-inspect`, `specs/shared/popup-clipping-fix.spec.md` → `fix/popup-clipping-fix`).
- Once the work is pushed and its pull request is open, remove its worktree with `git worktree remove .claude/worktrees/<spec-name>`. The work lives on in the branch; if the pull request needs changes, the `implement-notean-spec` skill adds a fresh worktree for the existing branch.

## Commands

### Frontend (run in `frontend/`)

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Dev server (http://localhost:4200) | `npm run dev` |
| Run tests | `npm test` |
| Build | `npm run build` |
| Generate a component (no spec file) | `npm run newcomponent <name>` |

### Backend (run in `backend/`)

| Task | Command |
|---|---|
| Install dependencies | `bundle install` |
| Start the database (from the repo root) | `docker compose up -d` |
| Set up / migrate the database | `bin/rails db:prepare` |
| Run the server (http://127.0.0.1:3000) | `bin/rails server` |
| Run all tests | `bin/rails test` |
| Run one test file | `bin/rails test test/models/folder_test.rb` |
| Lint | `bin/rubocop` |
| Security scan | `bin/brakeman` |

## Frontend

### Tech stack

- **Framework**: Angular 18 with standalone components, TypeScript 5.5, RxJS 7.8
- **HTTP**: axios
- **Realtime**: `@rails/actioncable`
- **i18n**: `@ngx-translate/core` with the http loader
- **Rich text**: Tiptap (core, pm, starter-kit)
- **Diagrams**: AntV X6 with the selection, snapline and keyboard plugins
- **Drag and drop and popups**: Angular CDK (drag-drop, overlay)
- **Theme fonts**: self-hosted `@fontsource/*` packages (Geist, Inter, Manrope, Plus Jakarta Sans, JetBrains Mono, IBM Plex Sans, Newsreader, DM Sans), included per weight in `angular.json` `styles`
- **Tests**: Karma + Jasmine

### Structure

```
src/app/
├── app/          root component, app.config.ts, app.routes.ts, app-routes.enum.ts
├── components/   reusable UI and feature widgets
├── pages/        routed screens; dashboard/ holds the child routes
├── services/     API access and app state, all providedIn: 'root'
├── models/       TypeScript interfaces and response union types
├── guards/       functional route guards
├── config/       axios instance, i18n config, language options, overlay positions, PHRASES, themes.ts, errorCodes/
├── testing/      shared spec fixtures (e.g. boardFixtures.ts)
└── utils/        small pure helpers (themeDom.ts applies and reads themes)
public/assets/translations/   one <code>.json per language (en, lv, et, lt, ru, sv, fi, de, da, fr, es)
src/themes/                   modes.css plus one CSS file per theme
src/environments/             environment.ts (apiUrl)
```

#### App and routing
- Route paths are defined in the `AppRoutes` enum in `app/app-routes.enum.ts` and wired in `app/app.routes.ts`. Use the enum, never string literals.
- Auth and team flow pages are top-level routes. Feature screens are child routes of `dashboard`, a shell (`DashboardComponent` with header and sidebar).
- Guards are functional `CanActivateFn`s: `authGuard` (logged in), `teamGuard` (active team selected), `teamRoleGuard` (role is `admin` or `owner`), and `featureGuard(feature)` (the team has that feature on, otherwise redirects to Home) on the pages, diagrams and boards routes.

#### Components
- Every component is `standalone: true` with its own `.ts`, `.html` and `.css` files, using `templateUrl` and `styleUrl`.
- Inputs and outputs use `@Input()` and `@Output()` with `EventEmitter`, not signals.
- CSS class names follow a camelCase BEM style: `kanbanCard`, `itemTree__row`, `dashboardStub__title`.
- Reuse the shared components in `components/` (buttons, icons, dialogs and so on) rather than building new ones.
- Title and name inputs bind `[maxlength]="TITLE_MAX_LENGTH"` and description textareas `[maxlength]="DESCRIPTION_MAX_LENGTH"`, from `config/contentLimits.ts`, matching the backend's `ContentLimits`.
- Icon-only controls get a styled tooltip with the `appTooltip` directive (`components/tooltip/`) plus an `aria-label`, never a native `title`. `app-icon-button` applies it from its `tooltip` input.

#### Services and HTTP
- All HTTP goes through `axiosInstance` from `@config/axiosConfig`, not Angular's `HttpClient`. `HttpClient` is only used to load translation files.
- `setAuthToken` sets the Bearer header, and a 401 response triggers the handler registered via `setUnauthorizedHandler`. `AuthService.logout()` also ends the server session (`DELETE /auth/session`, failures ignored).
- The API base URL comes from `environment.apiUrl` in `src/environments/`.
- Services convert the API's snake_case JSON into camelCase models using `map*` functions, such as `mapFolderedItemSummary` in `foldered-item.service.ts`.
- Service methods return `Result<T, E>` from `@models/result.model`: `{ success: true, ...payload }` or `{ success: false, code }`, where `code` is one of the error codes the request can return. Wrap requests in `apiRequest` from `@utils/apiRequest`, which maps the success data and turns failures into a code via `toErrorResult`.
- Build team-scoped URLs with `teamPath(teamCode, ...segments)` from `@utils/teamPath`.
- Pages and diagrams share `FolderedItemService`, `EditingService`, `FolderedListPageComponent`, `FolderedItemDetailComponent` and `ItemDetailLayoutComponent`; the page and diagram classes only configure them. "New page" and "New diagram" open the detail popup in create mode at `…/new` (`?folder=<id>` for a folder's "+"); nothing is saved until Create, which sends title, content, project and folder in one request and returns to the list, passing the created item in router navigation state (`createdItem`) so the list places it in its level.
- Session state lives in services backed by `localStorage`: `AuthService` stores `authToken` and `authUser`, and `TeamService` stores `currentTeam`, `currentTeamRole` and `currentNickname`.
- Board and ticket URLs are built with `boardRoute` / `ticketRoute` from `@utils/ticketRoute`.
- `SessionService` loads `GET /users/me` (user, settings, avatar, last-active team) on startup and after login and register, and hands the parts to `SettingsService.set`, `ThemeService.apply`, `AvatarService.set` and `TeamService.applyActiveTeam`. Its `clear()` resets settings, avatar and team on logout and 401, but keeps the theme. The other services don't load on their own.
- List screens apply each mutation's response locally instead of reloading. The Pages, Diagrams and Projects screens, the project detail Pages and Diagrams lists and the board List tab load 50 items at a time (the API's `offset` and `has_more`) and end each list with `LoadMoreComponent` (`app-load-more`) while more exist; their search runs on the server, debounced by 300 ms.
- Pages and Diagrams load every folder but items per level: `FolderedListPageComponent` keeps an `ItemLevelState` per level (`'root'` or a folder id), `ItemTreeComponent` emits `expandFolder` (the level loads once) and `loadMore`, and a level's next page starts after the loaded items that sort up to the last one the server sent (`compareByTitle` from `@utils/titleOrder`), so local renames, moves and creates don't shift it. Search results are a flat list.
- Pages, diagrams and tickets carry `lockVersion`. Saves of page or diagram title or content (including the list's inline rename) and of ticket title or description send it through `versionedRequest` from `@utils/apiRequest`, which turns a 409 into `EditConflict<T>` (`{ success: false, code: 'EDIT_CONFLICT', latest }`) from `@models/result.model`. The detail popups and the ticket popup then show `EditConflictDialogComponent` (*Load latest* / *Overwrite*, Esc keeps the draft); the list shows the latest item and the error in its alert. Keep `lockVersion` from every response, since moves and project changes bump it too.
- Boards open at `/dashboard/boards/:id/{overview|kanban|list}` (the old `backlog` URLs redirect to `list`). `BoardPageComponent` provides a component-scoped `BoardPageStateService` that loads the board once; the tabs and the ticket popup (a child route of the Kanban or List tab) read and update that shared board.
- The List tab (`ListTabComponent` with `ListRowComponent` rows) shows the tickets grouped by status (Backlog, then each column), loading each group 50 at a time through `TicketService.list` with server search and `TicketFilterComponent` filters (the column filter picks which groups load; any change reloads the groups and clears the selection), and a `TicketSelectionBarComponent` for bulk actions over the selected loaded tickets through `TicketService.bulkUpdate` / `bulkDelete`. It keeps its own per-group tickets and follows `BoardPageStateService.ticketChanges$` (emitted by the state's ticket mutations, so popup edits and live updates both arrive) and `boardLoaded$`: loaded tickets update or disappear in place, and other tickets are inserted only within a group's loaded range and only while no search or assignee filter is on; your own new ticket always shows. Board priorities are managed in the Overview tab's `PriorityListComponent` through `PriorityService`, chosen in the ticket popup's Priority dropdown, and shown as a `.priorityDot` (colours in the `--priority-*` variables) in List rows; `BoardPageStateService.setPriorities` / `priorityById` keep them in the shared board. The sidebar's board list and its personal order come from `BoardListService` (`localStorage`).
- The header's project selector is backed by `ProjectFilterService`, which loads every visible project through `ProjectService.listProjectOptions` (`projects/options`) and stores the choice per team (`selectedProject:<team>`, falling back to All). Lists, the sidebar boards, Favorites and My Work follow it; pass its value to the API with `projectQuery` from `@utils/projectQuery`, and new items default to the selected project.
- The header's `GlobalSearchComponent` searches the whole team through `SearchService` (`GET /teams/:team_code/search`). It follows the project selector, opens with `/`, and shows its results in a CDK overlay panel grouped by type.
- Esc goes through `EscapeService`, a stack of layers with one `document` keydown listener. Dialogs, the item and ticket popups, and the Settings, Profile, Manage team, Switch team and project pages `push` a handler in `ngOnInit` (dialogs cancel, popups close, pages go back) and call the returned unregister function in `ngOnDestroy`; only the top one runs. An inner control that uses Esc (an inline rename, an open dropdown, a diagram selection) calls `event.preventDefault()`, and the service then does nothing. CDK connected overlays already do this. Specs that build components with `new` pass `escapeServiceStub()` from `testing/`.
- Realtime goes through `CableService`, which owns the app's single ActionCable consumer at `ws://…/cable?ticket=<ticket>` (created on first use, after fetching a cable ticket from `POST /auth/cable_ticket`; never the login token). It refreshes the ticket every 45 seconds while connected, so ActionCable's reconnects always find a valid one. Feature services subscribe with `CableService.subscribe(params, callbacks)`, which returns a `CableSubscription` handle right away and subscribes once the ticket arrives, and only unsubscribe their own subscription on `disconnect()`; `SessionService.clear()` calls `CableService.disconnect()` on logout and 401.
- Boards update live: `BoardChannelService`, provided by `BoardPageComponent` next to `BoardPageStateService`, subscribes to `BoardChannel` once the board loads and applies each message to the shared board (`applyTickets` plus a re-sort by position, `removeTickets`, `setColumns`, `setPriorities`, `setBoardMeta`). `board_deleted`, or an `access_changed` reload that returns `BOARD_NOT_FOUND`, sends the user Home with a toast. `BoardPageStateService.remoteChanges$` tells the ticket popup about remote changes (with any ticket descriptions); the popup refreshes fields that aren't being edited, takes the remote `lockVersion` unless a typed draft is kept (so saving that draft goes through the conflict check), and closes with a toast when its ticket disappears.
- Team feature flags (`pagesEnabled`, `diagramsEnabled`, `boardsEnabled` on `Team`, mapped by `mapTeam`) are read through `TeamService.features$` and `isFeatureEnabled`. `TeamChannelService`, connected from `DashboardComponent` (and from Manage team, which sits outside it), applies `features_changed` broadcasts, sends a member removed from the active team to team selection with a toast on `member_removed`, and emits `membersChanged$` (which Manage team reloads on) for `members_changed` and other members' removal, and the dashboard sends members on a just-disabled feature's screen to Home with a toast. A `FEATURE_DISABLED` 403 reloads the session (`setFeatureDisabledHandler`). Hide a disabled feature's UI with `features$`.

#### Themes
- Each user picks one of nine themes (`THEMES` in `config/themes.ts`) and a mode (`system`, `light` or `dark`) on the Settings page. Both are saved with the other settings and cached in `localStorage` (`theme`, `themeMode`) for first paint.
- A theme is design tokens only. `data-theme` and `data-mode` on `<html>` select the tokens. `main.ts` applies the cached theme before bootstrap (the CSP forbids inline scripts), and `ThemeService` applies, previews and follows the OS in System mode, emitting `theme$`.
- Every theme provides every token in `THEME_TOKENS` (`config/themes.spec.ts` checks this). `src/themes/modes.css` holds shared per-mode defaults. Each theme file has three attribute-only blocks: `[data-theme='<key>']` for fonts, radii, spacing and heights, then `[data-theme='<key>'][data-mode='dark']` and `[data-mode='light']` for colours. Font sizes and transitions stay global in `styles.css`.
- Component CSS never hardcodes colours. Use the tokens, and write translucent shades as `color-mix(in srgb, var(--token) N%, transparent)` (`--color-tint` for hover and divider shades). Buttons, inputs and dropdown triggers use `--control-height`, and list rows use `--row-height`.
- To add a theme: create its CSS file with the three blocks, add it to both `styles` arrays in `angular.json`, add its key to `THEMES` and to `User::THEMES` on the backend, and add its name to `PHRASES` and every translation file.
- Code that paints outside CSS reads tokens with `themeToken()` and re-applies on `theme$` (the flowchart editor recolours cells, grid and gradient). Chart colours are `var(--color-chart-N)` from `chartColor()`, bound through `[style.fill]`.

#### Path aliases
Import with the tsconfig aliases instead of relative paths: `@components/*`, `@config/*`, `@pages/*`, `@models/*`, `@services/*`, `@utils/*`.

#### i18n
- All user-facing text goes through ngx-translate. Add the key to `PHRASES` in `config/phrases.ts`, then to every translation file in `public/assets/translations/` (`en.json`, `lv.json` and the other languages in `supportedTranslations`).
- Templates use `{{ PHRASES.KEY | translate }}`.
- API error codes live per domain in `config/errorCodes/` and mirror the backend's `ErrorCodes` modules. Translations sit under `ERRORS.<DOMAIN>.<CODE>` in every translation file, and `errorPhrase(code)` from `@utils/errorPhrase` returns the key. `NETWORK_ERROR` and `UNKNOWN_ERROR` are frontend-only. Never show backend text to users.

#### Style
- Code uses 2-space indentation and single quotes in `.ts` files (see `.editorconfig`).
- Production budgets: component styles warn at 2kB and error at 4kB, and the initial bundle warns at 900kB.

## Backend

### Tech stack

- **Framework**: Rails 8.1 (API-only) on Ruby 3.3.5, served by Puma
- **Database**: PostgreSQL 17, run with Docker Compose in development and tests
- **Auth**: `jwt` gem for tokens, `bcrypt` via `has_secure_password`
- **Realtime**: ActionCable
- **Security**: rack-attack for rate limiting, rack-cors
- **Tests**: Minitest with fixtures
- **Linting**: RuboCop (rubocop-rails-omakase), Brakeman

### Structure

```
app/
├── controllers/   one controller per resource
├── models/        ActiveRecord models plus cache-backed *EditingStatus classes (on EditingStatus)
├── errors/        error_codes/, one ErrorCodes module per domain
└── channels/      ActionCable connection, editing presence channels (on EditingChannel), TeamChannel and BoardChannel
config/
├── routes.rb
└── initializers/  cors.rb, rack_attack.rb
lib/json_web_token.rb   JWT encode/decode (HS256, signed with secret_key_base): session tokens without expiry, 1-minute cable tickets
db/schema.rb
test/              controllers/, models/, channels/, lib/, fixtures/
```

#### Routes
- Auth endpoints live under `auth/`: `register`, `login`, `DELETE auth/session` (logout) and `POST auth/cable_ticket`.
- Team routes use the team `code` as the param, not the id. Team-owned resources are nested under `teams/:team_code`.
- `GET /teams/:team_code/search` (`SearchController`) searches projects, pages, diagrams, boards and tickets the user can see. Without `type` it returns 5 results per section; with `type` and `offset` it returns the next 10 of one section.
- List endpoints paginate with `paginate(relation)` from `ApplicationController`: `offset` (default 0) and a fixed `PAGE_SIZE` of 50, responding with `has_more` next to the list key. `GET /teams/:team_code/pages` and `/diagrams` take `folder_id` (`root` or a folder id; an unknown or hidden folder is 404 `FOLDER_NOT_FOUND`) and `search` (title, across every folder; it ignores `folder_id`), ordered by `LOWER(title), id`; with neither they list everything flat. `GET /teams/:team_code/projects` takes `search` (name and description), ordered by `LOWER(name), id`, and `GET /teams/:team_code/projects/options` returns every visible project as `{ id, name }`.
- `GET /teams/:team_code/boards/:board_id/tickets` (`TicketsController#index`) lists one status group in position order: `status` (`backlog` or a column id, required: 422 `TICKET_STATUS_REQUIRED`, or 404 `COLUMN_NOT_FOUND`), `search` (title and description), `assignee_ids[]` (`none` means unassigned) and `offset`.
- `MembersController` handles `DELETE /teams/:code/members/:user_id` (owner, or admin on a `user`), `PATCH /teams/:code/members/:user_id/role` (owner, `user` ↔ `admin`), `POST /teams/:code/transfer_ownership` (owner; the old owner becomes `admin`) and `POST /teams/:code/leave` (anyone but the owner). Remove, role and transfer respond with the active members.
- `PATCH` and `DELETE /teams/:team_code/boards/:board_id/tickets/bulk` (`TicketsController#bulk_update` / `#bulk_destroy`) take `{ bulk: { ticket_ids, ... } }` with exactly one of `column_id`, `to_backlog`, `add_assignee_id` or `remove_assignee_id` for the update. They are all-or-nothing: an id outside the board fails the whole request.
- `POST`, `PATCH` and `DELETE /teams/:team_code/boards/:board_id/priorities` (`PrioritiesController`) manage a board's priorities; update and delete respond with all of the board's priorities. The board JSON includes `priorities` (with `ticket_count`, built by the `PriorityJson` concern) and tickets carry `priority_id`, which ticket update accepts.
- `PATCH /users/me/password` (`UsersController#update_password`) takes `{ password: { current_password, new_password } }` and responds 204, or 422 `CURRENT_PASSWORD_INVALID` / `PASSWORD_TOO_SHORT`. A successful change deletes the user's other sessions and keeps the current one. The Profile page's Password section calls it through `AuthService.changePassword`, outside Profile's unsaved-changes guard.
- ActionCable is mounted at `/cable`.

#### Controllers
- Everything inherits from `ActionController::API`.
- Strong params are defined centrally as private methods in `ApplicationController` (`create_page_params`, `update_page_params` and so on). Add new ones there.
- Auth: `before_action :authenticate_user!` reads `Authorization: Bearer <jwt>` through `current_user`. The token carries only a `session_id`; `current_user` accepts it only if that `UserSession` is active (used in the last 30 days, `UserSession::IDLE_EXPIRY`), records use at most hourly (`touch_if_stale!`) and sets `@current_session`. Login and register create a session, login also deletes the user's expired ones, and logout destroys the current one. Tokens with a `purpose` (cable tickets) are rejected.
- Team scoping follows a `before_action` chain: `set_team` (found by `params[:team_code]`), then `authorize_team_member!`, then `set_<resource>` scoped through `@team`. `set_team`, `authorize_team_member!`, `member_json`, `team_json` and `title_or_default` are shared in `ApplicationController`.
- Role checks use `require_team_role!(team, :admin, :owner)`, which returns nil after rendering 403.
- Feature flags: controllers of a switchable feature include `FeatureGated` and add `before_action -> { require_feature!(:boards) }` after `authorize_team_member!`, which renders 403 `FEATURE_DISABLED` when the team has it off. Aggregating endpoints (favorites, My Work, search) leave disabled types out instead of erroring.
- Project visibility goes through `project_access` (a `ProjectAccess` for the current user and team): scope `set_<resource>` with `project_access.scope(...)` so hidden items 404, filter lists with `project_filtered`, and set an item's project with `assign_project`. Put pages, diagrams and folders into a folder with `place_in_folder`, which looks the folder up through `visible_folder` and applies the folder's project. When an item's project changes, run `ProjectAccessCleanup` to drop assignments of people who lost access.
- JSON is built by hand with private `*_json` and `*_summary_json` helper methods. Board-scoped controllers share `set_board` (`BoardScoped` concern) and the ticket JSON helpers (`TicketJson` concern). There is no jbuilder or serializer gem.
- Response convention: success responses carry only the payload under a resource key (`{ page: ... }`). Errors are rendered with `render_error(ErrorCodes::Pages::PAGE_NOT_FOUND, :not_found)`, producing `{ code: "PAGE_NOT_FOUND" }` with the right status; `extra:` merges more keys into the error JSON. Add new codes to the matching module in `app/errors/error_codes/` and to the frontend's `config/errorCodes/` plus every translation file. Keys are snake_case.
- User-supplied rich-text HTML is sanitised with `Rails::Html::SafeListSanitizer` before saving.

#### Models
- Creators are stored as `created_by_user_id` with a `creator` association to `User`.
- Size limits come from the `ContentLimits` concern: titles and names (pages, diagrams, boards, tickets, folders, columns, projects, teams) up to `TITLE_MAX_LENGTH` (200), page and diagram `content` up to `CONTENT_MAX_BYTES` (1 MB), and ticket and project descriptions up to `DESCRIPTION_MAX_LENGTH` (10,000). Controllers render `limit_error_code(record)` (`TITLE_TOO_LONG`, `CONTENT_TOO_LARGE` or `DESCRIPTION_TOO_LONG`) before their own `*_FAILED` code.
- Users carry their settings as columns, including `theme` (one of `User::THEMES`, default `purple_haze`) and `theme_mode` (`system`, `light` or `dark`, default `system`). `GET /users/me` and `PATCH /users/me/settings` return them, and an invalid value is a 422 `SETTINGS_UPDATE_FAILED`.
- `Membership` joins users and teams. Its `role` enum is `user`, `admin` and `owner`, with exactly one owner per team.
- Memberships are soft-removed with `removed_at` (`remove!` runs `MembershipRemoval`, which moves the person's projects to the team owner and drops their project memberships, ticket assignments, favorites and editing presence in the team). The default `memberships` associations on `User` and `Team` are active-only, so every membership check ignores former members; `all_memberships` includes them and is used for nicknames in content, rejoining (`restore!`) and team deletion. Removed rows still reserve their nickname.
- Deleting an account (`DELETE /users/me`, blocked with 422 `OWNS_TEAMS` plus the owned `teams` while the user owns any team) anonymises the user instead of deleting the row: `User#anonymise!` removes every membership through `MembershipRemoval`, scrubs the email to `deleted-<id>@deleted.invalid`, replaces the password, purges the avatar and sets `deleted_at`, and the request deletes all of the user's sessions. Content keeps the user's last nickname. `current_user` and the cable connection only accept sessions of `User.active` users, and login looks users up through `User.active`, so deleted users and their old tokens are ignored.
- Teams have `pages_enabled`, `diagrams_enabled` and `boards_enabled` flags (all on by default), checked with `Team#feature_enabled?`. Only the owner changes them (`PATCH /teams/:code/features`). Tickets, columns, priorities and assignees follow `boards`; folders follow their item type. Flags never delete data.
- Tickets have any number of assignees through `ticket_assignees` (team members only, ordered by assignment time; assigning touches the ticket).
- Pages, diagrams, boards and folders can belong to a project (`BelongsToProject` concern); tickets follow their board's project. Project items are private to the project's members plus the team owner and admins.
- A folder's subfolders, pages and diagrams always share its project; only top-level folders have their project changed (`PROJECT_SET_BY_FOLDER` otherwise). `FolderProject.apply` moves a whole folder tree to a project.
- A ticket belongs to a board and optionally a column; `column_id` null means it is in the board's backlog. `position` orders it within its column or the backlog.
- Each board has its own ordered `BoardPriority` list (name, colour from `BoardPriority::COLORS`, position), created from `BoardPriority::DEFAULTS` by a `Board` `after_create`. A ticket's optional `priority_id` must point to a priority of its own board; deleting a priority clears it from its tickets.
- Pages, diagrams and tickets use optimistic locking (`lock_version`). In `update`, `assign_lock_version(record, params, *keys)` requires `lock_version` when the request touches one of the keys (422 `LOCK_VERSION_REQUIRED`), and a rescued `ActiveRecord::StaleObjectError` renders 409 `EDIT_CONFLICT` with the reloaded item under its resource key. Moves, project changes and assignee changes send no version and never conflict, but `save` and `touch` still bump it; `update_column(s)` and `update_all` don't.
- Short-lived state, such as who is currently editing, lives in `Rails.cache` through plain Ruby classes (`*EditingStatus`), not tables. Changes are broadcast over ActionCable.
- Title search uses the `TitleSearchable` concern's `search_title` scope (the pages and diagrams index search).
- Global search uses the `TextSearchable` concern: models declare `text_searchable :title, ...` (title or name column first) and get the `text_search` and `title_match_first` scopes. Pages and diagrams keep a plain-text `search_text` column, refreshed from `content` on save by `SearchText` (page HTML without tags, diagram shape and connector labels).
- List and detail endpoints preload what their JSON uses (e.g. `includes(creator: User::AVATAR_PRELOAD)`) so query counts don't grow with the number of items.

#### Channels
- `ApplicationCable::Connection` authenticates with a cable ticket passed as the `?ticket=` query param (`purpose: "cable"`, 1-minute expiry, active session). `?token=` is not accepted.
- Editing channels only subscribe members of the item's team who can see the item's project, and only while the item's feature is on.
- `TeamChannel` (`team_code` param, members only) streams `team:<id>` and carries `{ type: "features_changed", team }`, `{ type: "member_removed", user_id, team }` (remove and leave) and `{ type: "members_changed" }` (role change and transfer) broadcasts.
- `BoardChannel` (`board_id` param) only subscribes members of the board's team who can see its project, while boards are on, and streams `board:<id>`. Board-scoped controllers broadcast through `BoardBroadcast` on a separate line after their render: `tickets_upserted` (changed tickets plus reindexed siblings; tickets changed by create, update or an assignee action also carry `description`), `tickets_removed`, `columns_changed`, `priorities_changed` (plus the tickets a delete cleared), `board_updated`, `board_deleted` and `access_changed` (the board's project changed). Payloads reuse the controllers' JSON helpers.

#### Security
- rack-attack throttles the auth and join-team endpoints. A throttled request gets a 429 with `{ code: "RATE_LIMITED" }`.
- The CORS origin comes from `FRONTEND_ORIGIN` (default `http://localhost:4200`).

#### Tests
- Minitest with `fixtures :all` and parallel workers.
- Endpoints that render lists have a query-count test: `query_count { get ... }` (from `test_helper.rb`) with 1 and with 10 items must be equal.
- Requests authenticate with `session_token(user)` (from `test_helper.rb`), which creates a `UserSession` and returns its token.
