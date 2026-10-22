# Global search — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-22

# Part 1 — Business logic and usage

A search bar in the middle of the dashboard header, similar to Jira's. It searches everything in the current team that the user is allowed to see: projects, pages, diagrams, boards and tickets. Each result row shows an icon for its type (for example the document icon for pages), so you can tell at a glance what each result is.

- **Users:** every team member in the dashboard.
- **Usage:**
  - The bar sits centered in the dashboard header with the placeholder "Search everything". Pressing `/` anywhere in the dashboard focuses it, unless focus is already in an input, textarea or rich-text editor.
  - **Searching:** once there are at least 2 characters, results appear 250ms after the user stops typing. While a request is running, the panel shows a loading state. Each new keystroke replaces the previous search.
  - **Panel:** a panel opens under the bar with up to five sections, in this order: Projects, Pages, Diagrams, Boards, Tickets. Sections without results are hidden. Each section shows up to 5 results. When more exist, a "Show more" row at the end of the section loads 10 more into that section.
  - **Row content:** each row shows:
    - the type icon
    - the title (the name, for projects)
    - a context line: the ticket's board for tickets, and the project name for pages, diagrams and boards that belong to one
    - a snippet, when the match was in the content rather than the title: about 80 characters of text around the match, with the matched text highlighted
  - **What matches:** a case-insensitive "contains" match on:
    - projects: name and description
    - pages: title and page text
    - diagrams: title and the labels on shapes and connectors
    - boards: title
    - tickets: title and description
  - **Order within a section:** title or name matches first, then content matches. Within each group, the most recently updated come first.
  - **Project filter:**
    - The search follows the header project selector. With a project selected, it only finds that project and the things inside it, and the panel ends with a footer: "Currently searching in project '<name>'" and an **Include all projects** button.
    - Clicking the button reruns the search across all projects the user can see. It does not change the header selection. It stays on until the panel closes (Escape, a click outside or opening a result), then resets to the selected project.
    - With "All projects" selected there is no footer.
  - **Opening a result:** click it, or highlight it with the arrow keys and press Enter. Escape closes the panel and leaves the bar.
    - project → its project detail page
    - page or diagram → its detail popup
    - board → its Kanban tab
    - ticket → its ticket popup on the Kanban or Backlog tab, depending on where the ticket is
  - **Empty and error states:** "No results" when nothing matches. A short error message in the panel when the request fails.
- **Rules:**
  - Results only include what the user can already see: items without a project, items in projects the user is a member of, and everything for team owners and admins (the existing `ProjectAccess` rules). Tickets follow their board's project.
  - Everything is scoped to the current team.
  - The backend rejects queries shorter than 2 characters.
- **Out of scope:**
  - Folders (the user wants only the items themselves).
  - Team members.
  - A full-page results view.
  - Fuzzy or typo-tolerant matching.
  - Search indexes for performance (`pg_trgm`). Can be its own spec once data grows.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing stack: Rails and PostgreSQL, Angular, RxJS (`debounceTime`, `switchMap`), axios through `apiRequest`, ngx-translate, and the CDK overlay pattern from `POPUP_CLIPPING_FIX_SPEC.md` for the results panel. No new dependencies.

## 2.2 Structure

### Backend

**Migration:** add `search_text` (text, `default: ""`, `null: false`) to `pages` and `diagrams`, and backfill existing rows using `SearchText` (below) with `update_column`, so timestamps don't change.

**`app/models/search_text.rb`:** a plain Ruby class.
- `SearchText.from_html(html)` returns the page's text without tags: `Rails::Html::FullSanitizer`, then whitespace collapsed.
- `SearchText.from_diagram(json)` parses the X6 graph JSON. It joins every node's `attrs.text.text` and every edge's `labels[].attrs.label.text` with spaces. Invalid JSON gives `""`.

**Models:**
- `Page` sets `search_text` from `content` in a `before_save` when `content` changed.
- `Diagram` does the same with `from_diagram`.

**`app/models/concerns/text_searchable.rb`:**
- Models declare their columns with `text_searchable :title, :search_text`.
- It provides `scope :text_search, ->(term)`: `LOWER(col) LIKE %term%` on each column, joined with OR, with `sanitize_sql_like` and `ESCAPE '\\'` as in `TitleSearchable`.
- It provides `scope :title_match_first, ->(term)`: an `ORDER BY` putting title (or name) matches first, then `updated_at DESC`.
- Models and columns:

  | Model | Columns |
  |---|---|
  | `Project` | `name`, `description` |
  | `Page` | `title`, `search_text` |
  | `Diagram` | `title`, `search_text` |
  | `Board` | `title` |
  | `Ticket` | `title`, `description` |

**Route:** `get :search, to: "search#index"` inside `resources :teams`, giving `GET /teams/:team_code/search`.

**`SearchController`:** `authenticate_user!`, `set_team`, `authorize_team_member!`.
- **Params:**
  - `q`, required. When fewer than 2 characters after stripping, render `ErrorCodes::Search::QUERY_TOO_SHORT` with 422.
  - `project_id`, optional. Same meaning as the list endpoints, via `project_filtered`.
  - `type`, optional. One of `project`, `page`, `diagram`, `board`, `ticket`. Unknown values render `ErrorCodes::Search::INVALID_TYPE` with 422.
  - `offset`, optional, default 0.
- **Visibility:**
  - Pages, diagrams and boards: `project_filtered(@team.<items>)`.
  - Tickets: on boards from `project_filtered(@team.boards)`.
  - Projects: the team's projects limited to `project_access.visible_project_ids`, and to `project_id` when given.
- **Without `type`:** responds `{ sections: [{ type, results: [...], has_more }] }` for all five types, 5 results each. `has_more` is computed by fetching 6.
- **With `type`:** responds `{ section: { type, results, has_more } }` with 10 results from `offset`.
- **Result JSON** (`search_result_json`):
  - `type`, `id`, `title` (a project's `name`), `updated_at`
  - `project_name`, or null
  - `snippet`: null when the title or name matched. Otherwise about 80 characters of the matching column around the first match, with whitespace collapsed and "…" where it was cut.
  - for tickets: `board_id`, `board_title`, `in_backlog` (`column_id.nil?`)
- **Preloading:** `includes(:project)`, and `includes(board: :project)` for tickets, so the query count doesn't grow.

**`app/errors/error_codes/search.rb`:** `ErrorCodes::Search` with `QUERY_TOO_SHORT` and `INVALID_TYPE`.

### Frontend

**Icons:** add `project`, `page`, `diagram`, `board` and `ticket` to `IconName` in `components/icon/`.
- Move the SVG content of the sidebar's inline project, pages and diagrams icons into `icon.component.html`.
- Use the existing `columns` artwork for `board`, and draw a new simple ticket or card outline for `ticket`.
- `dashboard-sidebar.component.html` switches those three inline SVGs to `<app-icon>`.

**`models/search.model.ts`:**
- `SearchResultType` (`'project' | 'page' | 'diagram' | 'board' | 'ticket'`)
- `SearchResult` (camelCase fields from the result JSON)
- `SearchSection` (`type`, `results`, `hasMore`)
- response unions for `Result`

**`config/errorCodes/search.ts`:** mirrors the backend codes. Translations go under `ERRORS.SEARCH.*`.

**`services/search.service.ts`** (`providedIn: 'root'`):
- `search(teamCode, query, projectId)` → `Result<{sections}>`
- `searchMore(teamCode, query, projectId, type, offset)` → `Result<{section}>`
- Both use `apiRequest`, `teamPath(teamCode, 'search')` and `projectQuery`, with a `mapSearchResult` mapper.

**`components/global-search/`** (`GlobalSearchComponent`, `app-global-search`, CSS block `globalSearch`), placed in the middle of `dashboard-header.component.html`:
- **Input:** an input with `aria-label` that opens the panel when focused with 2+ characters.
- **Searching:** a `Subject<string>` piped through `debounceTime(250)`, a minimum of 2 characters, and `switchMap` to `SearchService.search`, so stale responses are dropped.
- **Panel:** rendered with the CDK overlay pattern (`POPUP_CLIPPING_FIX_SPEC.md`), at least as wide as the input. It has sections with a heading (reusing the `PROJECTS`, `DOCUMENT_PAGES`, `DIAGRAMS` and `BOARDS` phrases plus a new `TICKETS`), rows, and "Show more" rows that call `searchMore` with `offset` set to the section's current length and append the results.
- **Snippet highlight:** split into before, match and after text and render the match in a `<mark class="globalSearch__match">`. Use text bindings only, never `innerHTML`.
- **State:**
  - `includeAllProjects` (resets on close)
  - the project id sent: `null` when `includeAllProjects` is on, otherwise `ProjectFilterService.getSelectedProjectId()`
  - the footer, shown when a project is selected and `includeAllProjects` is off. Its name comes from `ProjectFilterService.getProjects()`.
- **Keyboard:**
  - A `document:keydown` listener focuses the input on `/`, unless the event target is an input, a textarea or `contenteditable`.
  - Arrow Up and Down move through result and "Show more" rows.
  - Enter opens a result or loads more.
  - Escape closes the panel and blurs the input.
- **Navigation:**
  - project → `[DASHBOARD, PROJECTS, id]`
  - page → `[DASHBOARD, DOCUMENT_PAGES, id]`
  - diagram → `[DASHBOARD, DIAGRAMS, id]`
  - board → `boardRoute(id)`
  - ticket → `ticketRoute(boardId, id, inBacklog)`
  - Opening a result closes the panel and clears the input.

**Phrases** (in `PHRASES`, `en.json` and `lv.json`, plus any other language files that exist by then):
- `SEARCH_EVERYTHING`
- `SEARCH_SHOW_MORE`
- `SEARCH_IN_PROJECT` ("Currently searching in project '{{project}}'")
- `SEARCH_INCLUDE_ALL_PROJECTS`
- `SEARCH_FAILED`
- `TICKETS`
- reuse `NO_SEARCH_RESULTS`

## 2.3 Decisions
1. **Types:** projects, pages, diagrams, boards and tickets. Folders were excluded ("just the items themselves").
2. **Matching:** titles and names plus content: project description, page text, diagram labels and ticket description. Title-only was rejected.
3. **Content storage:** a plain-text `search_text` column on pages and diagrams, kept up to date on save and backfilled by the migration. Stripping HTML at query time was rejected because it can't handle diagram JSON and is slower.
4. **Snippets:** shown for content matches, with the match highlighted.
5. **Project selector:** search follows the header selection. The "Include all projects" button widens only the current search and resets when the panel closes. It never changes the selection. Always searching everything, and strictly following the selector, were both rejected.
6. **Layout:** grouped by type, 5 per section, with "Show more" loading 10 more in place. A flat ranked list and a fixed 5 with no "Show more" were rejected.
7. **Trigger:** as you type, from 2 characters, debounced 250ms, through a backend endpoint. Searching on Enter was rejected.
8. **Shortcut:** `/`, like Jira. Ctrl/Cmd+K and no shortcut were rejected.
9. **Icons:** type icons live in the shared `app-icon` and the sidebar uses them too, so each type has one icon everywhere. Search-only icons were rejected.
10. **Endpoint shape:** one `GET /teams/:team_code/search` serving both the first load (all sections) and "Show more" (`type` plus `offset`). (Implementation choice, not one the user asked for.)
11. **Board icon:** reuses the existing `columns` artwork, and tickets get a new card icon. (Implementation choice, not one the user asked for.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Prerequisites: `POPUP_CLIPPING_FIX_SPEC.md` (the overlay pattern) is implemented.

Baseline before starting: frontend `npm test`, 375 of 375 passing. Run `bin/rails test` in `backend/` and note its count here before starting.

### A. Searchable text (backend)
- [ ] A1. Add `app/models/search_text.rb` with `from_html` and `from_diagram`. Add `test/models/search_text_test.rb` covering:
  - tags stripped and whitespace collapsed
  - node and edge labels extracted
  - invalid JSON gives `""`
- [ ] A2. Add the migration for `search_text` on `pages` and `diagrams`, with the backfill, and run `bin/rails db:migrate` so `db/schema.rb` updates.
- [ ] A3. Add the `before_save` hooks to `Page` and `Diagram`. Add model tests: saving content updates `search_text`, and saving only the title leaves it alone.
- [ ] A4. Add the `TextSearchable` concern and include it in `Project`, `Page`, `Diagram`, `Board` and `Ticket` with the columns from 2.2. Add tests for case-insensitive matching on each column, `%` and `_` treated literally, and title matches ordered first.

### B. Search endpoint (backend)
- [ ] B1. Add `ErrorCodes::Search`, the route and `SearchController` as described in 2.2.
- [ ] B2. Add `test/controllers/search_controller_test.rb` covering:
  - each type is found by title and by content, with the snippet set only for content matches
  - hidden project items never appear, but appear for admins
  - `project_id` limits results
  - a short query gives 422
  - `has_more` and `offset` paging work
  - a non-member gets 403 or 404 like other team endpoints
  - the query count is equal with 1 and with 10 matching items
- [ ] B3. Run `bin/rubocop` and `bin/brakeman`.

### C. Icons (frontend)
- [ ] C1. Add the `project`, `page`, `diagram`, `board` and `ticket` icons to `app-icon` and switch the sidebar's inline SVGs to them. Check visually that the sidebar is unchanged.

### D. Data layer (frontend)
- [ ] D1. Add `models/search.model.ts`, `config/errorCodes/search.ts` and their `ERRORS.SEARCH.*` translations.
- [ ] D2. Add `services/search.service.ts` with the mapper, and `search.service.spec.ts` covering the snake_case to camelCase mapping and that `project_id`, `type` and `offset` are sent correctly.

### E. Search UI (frontend)
- [ ] E1. Add the new phrases to `PHRASES`, `en.json`, `lv.json` and any other language files.
- [ ] E2. Generate `components/global-search` with `npm run newcomponent global-search` and build the input, debounced search, overlay panel, sections, rows with icons, context and highlighted snippet, "Show more", footer, loading, empty and error states.
- [ ] E3. Add the keyboard handling (`/`, arrows, Enter, Escape) and navigation per type.
- [ ] E4. Place `app-global-search` in the middle of the dashboard header and adjust `dashboard-header.component.css` so the brand and project selector stay on the left and the actions stay on the right.
- [ ] E5. Add `global-search.component.spec.ts` covering:
  - no request under 2 characters
  - only the latest query's results are shown
  - `includeAllProjects` sends no project id and resets on close
  - "Show more" appends with the right offset
  - `/` is ignored while typing in an input
  - each type navigates to the right route
  - snippet splitting

### Z. Wrap-up
- [ ] Z1. Run `bin/rails test`, `bin/rubocop` and `bin/brakeman` in `backend/`, and `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Update `CLAUDE.md`: mention the search endpoint, the `TextSearchable` concern and `search_text`.
- [ ] Z3. Manual check in the running app:
  - Press `/` and search a word that appears in a page's text, a diagram label, a ticket description and some titles. Each section shows icons, context and snippets, and every result opens the right place.
  - "Show more" loads more.
  - With a project selected, only that project's results show. "Include all projects" widens the search, the header selection is unchanged, and closing and reopening resets it.
  - As a non-member of a project, its items never appear.
