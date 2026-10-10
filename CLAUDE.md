# Notean

## Project context

Notean is a team workspace app for documents, diagrams and kanban boards. This monorepo holds both halves of the app:

- `frontend/`: an Angular single-page app served at `http://localhost:4200`.
- `backend/`: a Rails API-only app served at `http://127.0.0.1:3000`.

The frontend talks to the API at `http://127.0.0.1:3000` (`baseUrl` in `frontend/src/app/config/axiosConfig.ts`), and the API's CORS only allows `http://localhost:4200`. Both must be running for the app to work.

`backend/config/master.key` is committed on purpose for early dev convenience. It must be rotated and gitignored before any real deployment.

## Repository layout

```
notean/
├── CLAUDE.md
├── README.md
├── .claude/      Claude Code config (launch.json) and project skills
├── specs/        feature specs for the whole app
├── frontend/     Angular app
└── backend/      Rails API
```

Run frontend commands from `frontend/` and backend commands from `backend/`.

## Specs workflow

- Specs live in the root `specs/` folder and cover the whole feature, backend and frontend together.
- `specs/personal/` is gitignored. New specs, TODOs and scratch notes go here by default.
- `specs/shared/` is committed. Only put a spec here when explicitly asked to.
- Before implementing a feature, read its spec if one exists.

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
| Set up / migrate the database | `bin/rails db:migrate` |
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
- **Drag and drop**: Angular CDK
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
├── config/       axios instance, i18n config, language options, PHRASES
└── utils/        small pure helpers
public/assets/translations/   en.json, lv.json
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
- Services convert the API's snake_case JSON into camelCase models using `map*` functions, such as `mapPageSummary` in `page.service.ts`.
- Service methods return discriminated unions such as `{ success: true; page } | { success: false; statusMessage }`. Errors are converted with `toErrorResult` from `@utils/httpError`.
- Session state lives in services backed by `localStorage`: `AuthService` stores `authToken` and `authUser`, and `TeamService` stores `currentTeam` and `currentTeamRole`.
- Realtime features open an ActionCable consumer at `ws://…/cable?token=<jwt>` from a dedicated service and subscribe to the matching backend channel.

#### Path aliases
Import with the tsconfig aliases instead of relative paths: `@components/*`, `@config/*`, `@pages/*`, `@models/*`, `@services/*`, `@utils/*`.

#### i18n
- All user-facing text goes through ngx-translate. Add the key to `PHRASES` in `config/phrases.ts`, then to both `en.json` and `lv.json`.
- Templates use `{{ PHRASES.KEY | translate }}`.

#### Style
- Code uses 2-space indentation and single quotes in `.ts` files (see `.editorconfig`).
- Production budgets: component styles warn at 2kB and error at 4kB, and the initial bundle warns at 900kB.

## Backend

### Tech stack

- **Framework**: Rails 7.2 (API-only) on Ruby 3.3.5, served by Puma
- **Database**: SQLite
- **Auth**: `jwt` gem for tokens, `bcrypt` via `has_secure_password`
- **Realtime**: ActionCable
- **Security**: rack-attack for rate limiting, rack-cors
- **Tests**: Minitest with fixtures
- **Linting**: RuboCop (rubocop-rails-omakase), Brakeman

### Structure

```
app/
├── controllers/   one controller per resource
├── models/        ActiveRecord models plus cache-backed *EditingStatus classes
└── channels/      ActionCable connection and editing presence channels
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
- Team scoping follows a `before_action` chain: `set_team` (found by `params[:team_code]`), then `authorize_team_member!`, then `set_<resource>` scoped through `@team`.
- Role checks use `require_team_role!(team, :admin, :owner)`, which returns nil after rendering 403.
- JSON is built by hand with private `*_json` and `*_summary_json` helper methods in each controller. There is no jbuilder or serializer gem.
- Response convention: every response includes a `statusMessage`, and the payload sits under a resource key (`{ page: ..., statusMessage: 'Page found' }`). Errors are `{ statusMessage: '...' }` with the right status (401, 403, 404 or 422). Keys are snake_case.
- User-supplied rich-text HTML is sanitised with `Rails::Html::SafeListSanitizer` before saving.

#### Models
- Creators are stored as `created_by_user_id` with a `creator` association to `User`.
- `Membership` joins users and teams. Its `role` enum is `user`, `admin` and `owner`, with exactly one owner per team.
- Short-lived state, such as who is currently editing, lives in `Rails.cache` through plain Ruby classes (`*EditingStatus`), not tables. Changes are broadcast over ActionCable.

#### Channels
- `ApplicationCable::Connection` authenticates with the JWT passed as the `?token=` query param.

#### Security
- rack-attack throttles the auth and join-team endpoints. A throttled request gets a 429 with a JSON `statusMessage`.

#### Tests
- Minitest with `fixtures :all` and parallel workers.
