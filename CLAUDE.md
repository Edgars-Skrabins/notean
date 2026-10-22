# Notean

## Project context

Notean is a team workspace app for documents, diagrams and kanban boards. This monorepo holds both halves of the app:

- `frontend/`: an Angular single-page app served at `http://localhost:4200`.
- `backend/`: a Rails API-only app served at `http://127.0.0.1:3000`.

The frontend talks to the API at `http://127.0.0.1:3000` (`apiUrl` in `frontend/src/environments/environment.ts`), and the API's CORS only allows `http://localhost:4200` (overridable with `FRONTEND_ORIGIN`). Both must be running for the app to work.

`backend/config/master.key` is committed on purpose for early dev convenience. It must be rotated and gitignored before any real deployment.

The dev and test database URLs in `backend/config/database.yml` (user and password `notean`, matching `docker-compose.yml`) are committed for the same reason. Before deploying, an env file must provide `DATABASE_URL` with real credentials.

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
- Once a branch is merged, remove its worktree with `git worktree remove .claude/worktrees/<spec-name>`.

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
├── config/       axios instance, i18n config, language options, overlay positions, PHRASES, errorCodes/
├── testing/      shared spec fixtures (e.g. boardFixtures.ts)
└── utils/        small pure helpers
public/assets/translations/   en.json, lv.json
src/environments/             environment.ts (apiUrl)
```

#### App and routing
- Route paths are defined in the `AppRoutes` enum in `app/app-routes.enum.ts` and wired in `app/app.routes.ts`. Use the enum, never string literals.
- Auth and team flow pages are top-level routes. Feature screens are child routes of `dashboard`, a shell (`DashboardComponent` with header and sidebar).
- Guards are functional `CanActivateFn`s: `authGuard` (logged in), `teamGuard` (active team selected), `teamRoleGuard` (role is `admin` or `owner`).

#### Components
- Every component is `standalone: true` with its own `.ts`, `.html` and `.css` files, using `templateUrl` and `styleUrl`.
- Inputs and outputs use `@Input()` and `@Output()` with `EventEmitter`, not signals.
- CSS class names follow a camelCase BEM style: `kanbanCard`, `itemTree__row`, `dashboardStub__title`.
- Reuse the shared components in `components/` (buttons, icons, dialogs and so on) rather than building new ones.

#### Services and HTTP
- All HTTP goes through `axiosInstance` from `@config/axiosConfig`, not Angular's `HttpClient`. `HttpClient` is only used to load translation files.
- `setAuthToken` sets the Bearer header, and a 401 response triggers the handler registered via `setUnauthorizedHandler`.
- The API base URL comes from `environment.apiUrl` in `src/environments/`.
- Services convert the API's snake_case JSON into camelCase models using `map*` functions, such as `mapFolderedItemSummary` in `foldered-item.service.ts`.
- Service methods return `Result<T, E>` from `@models/result.model`: `{ success: true, ...payload }` or `{ success: false, code }`, where `code` is one of the error codes the request can return. Wrap requests in `apiRequest` from `@utils/apiRequest`, which maps the success data and turns failures into a code via `toErrorResult`.
- Build team-scoped URLs with `teamPath(teamCode, ...segments)` from `@utils/teamPath`.
- Pages and diagrams share `FolderedItemService`, `EditingService`, `FolderedListPageComponent`, `FolderedItemDetailComponent` and `ItemDetailLayoutComponent`; the page and diagram classes only configure them.
- Session state lives in services backed by `localStorage`: `AuthService` stores `authToken` and `authUser`, and `TeamService` stores `currentTeam`, `currentTeamRole` and `currentNickname`.
- Board and ticket URLs are built with `boardRoute` / `ticketRoute` from `@utils/ticketRoute`.
- `SessionService` loads `GET /users/me` (user, settings, avatar, last-active team) on startup and after login and register, and hands the parts to `SettingsService.set`, `AvatarService.set` and `TeamService.applyActiveTeam`. Its `clear()` resets all three on logout and 401. The other services don't load on their own.
- List screens load once and apply each mutation's response locally instead of reloading; Pages and Diagrams search filters loaded items in the browser.
- Boards open at `/dashboard/boards/:id/{overview|kanban|backlog}`. `BoardPageComponent` provides a component-scoped `BoardPageStateService` that loads the board once; the tabs and the ticket popup (a child route of the Kanban or Backlog tab) read and update that shared board. The sidebar's board list and its personal order come from `BoardListService` (`localStorage`).
- The header's project selector is backed by `ProjectFilterService`, which stores the choice per team (`selectedProject:<team>`, falling back to All). Lists, the sidebar boards, Favorites and My Work follow it; pass its value to the API with `projectQuery` from `@utils/projectQuery`, and new items default to the selected project.
- Realtime features open an ActionCable consumer at `ws://…/cable?token=<jwt>` from a dedicated service and subscribe to the matching backend channel.

#### Path aliases
Import with the tsconfig aliases instead of relative paths: `@components/*`, `@config/*`, `@pages/*`, `@models/*`, `@services/*`, `@utils/*`.

#### i18n
- All user-facing text goes through ngx-translate. Add the key to `PHRASES` in `config/phrases.ts`, then to both `en.json` and `lv.json`.
- Templates use `{{ PHRASES.KEY | translate }}`.
- API error codes live per domain in `config/errorCodes/` and mirror the backend's `ErrorCodes` modules. Translations sit under `ERRORS.<DOMAIN>.<CODE>` in both JSON files, and `errorPhrase(code)` from `@utils/errorPhrase` returns the key. `NETWORK_ERROR` and `UNKNOWN_ERROR` are frontend-only. Never show backend text to users.

#### Style
- Code uses 2-space indentation and single quotes in `.ts` files (see `.editorconfig`).
- Production budgets: component styles warn at 2kB and error at 4kB, and the initial bundle warns at 900kB.

## Backend

### Tech stack

- **Framework**: Rails 7.2 (API-only) on Ruby 3.3.5, served by Puma
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
└── channels/      ActionCable connection and editing presence channels (on EditingChannel)
config/
├── routes.rb
└── initializers/  cors.rb, rack_attack.rb
lib/json_web_token.rb   JWT encode/decode (HS256, 24h expiry, signed with secret_key_base)
db/schema.rb
test/              controllers/, models/, channels/, lib/, fixtures/
```

#### Routes
- Auth endpoints live under `auth/`.
- Team routes use the team `code` as the param, not the id. Team-owned resources are nested under `teams/:team_code`.
- ActionCable is mounted at `/cable`.

#### Controllers
- Everything inherits from `ActionController::API`.
- Strong params are defined centrally as private methods in `ApplicationController` (`create_page_params`, `update_page_params` and so on). Add new ones there.
- Auth: `before_action :authenticate_user!` reads `Authorization: Bearer <jwt>` through `current_user`.
- Team scoping follows a `before_action` chain: `set_team` (found by `params[:team_code]`), then `authorize_team_member!`, then `set_<resource>` scoped through `@team`. `set_team`, `authorize_team_member!`, `member_json`, `team_json` and `title_or_default` are shared in `ApplicationController`.
- Role checks use `require_team_role!(team, :admin, :owner)`, which returns nil after rendering 403.
- Project visibility goes through `project_access` (a `ProjectAccess` for the current user and team): scope `set_<resource>` with `project_access.scope(...)` so hidden items 404, filter lists with `project_filtered`, and set an item's project with `assign_project`. When an item's project changes, run `ProjectAccessCleanup` to drop assignments of people who lost access.
- JSON is built by hand with private `*_json` and `*_summary_json` helper methods. Board-scoped controllers share `set_board` (`BoardScoped` concern) and the ticket JSON helpers (`TicketJson` concern). There is no jbuilder or serializer gem.
- Response convention: success responses carry only the payload under a resource key (`{ page: ... }`). Errors are rendered with `render_error(ErrorCodes::Pages::PAGE_NOT_FOUND, :not_found)`, producing `{ code: "PAGE_NOT_FOUND" }` with the right status. Add new codes to the matching module in `app/errors/error_codes/` and to the frontend's `config/errorCodes/` plus both translation files. Keys are snake_case.
- User-supplied rich-text HTML is sanitised with `Rails::Html::SafeListSanitizer` before saving.

#### Models
- Creators are stored as `created_by_user_id` with a `creator` association to `User`.
- `Membership` joins users and teams. Its `role` enum is `user`, `admin` and `owner`, with exactly one owner per team.
- Tickets have any number of assignees through `ticket_assignees` (team members only, ordered by assignment time; assigning touches the ticket).
- Pages, diagrams and boards can belong to a project (`BelongsToProject` concern); tickets follow their board's project. Project items are private to the project's members plus the team owner and admins.
- A ticket belongs to a board and optionally a column; `column_id` null means it is in the board's backlog. `position` orders it within its column or the backlog.
- Short-lived state, such as who is currently editing, lives in `Rails.cache` through plain Ruby classes (`*EditingStatus`), not tables. Changes are broadcast over ActionCable.
- Title search uses the `TitleSearchable` concern's `search_title` scope (kept for future pagination; the UI searches client-side).
- List and detail endpoints preload what their JSON uses (e.g. `includes(creator: User::AVATAR_PRELOAD)`) so query counts don't grow with the number of items.

#### Channels
- `ApplicationCable::Connection` authenticates with the JWT passed as the `?token=` query param.
- Editing channels only subscribe members of the item's team who can see the item's project.

#### Security
- rack-attack throttles the auth and join-team endpoints. A throttled request gets a 429 with `{ code: "RATE_LIMITED" }`.
- The CORS origin comes from `FRONTEND_ORIGIN` (default `http://localhost:4200`).

#### Tests
- Minitest with `fixtures :all` and parallel workers.
- Endpoints that render lists have a query-count test: `query_count { get ... }` (from `test_helper.rb`) with 1 and with 10 items must be equal.
