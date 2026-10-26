# List pagination — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

The Pages, Diagrams and Projects screens, the project detail page and the board List tab load every item at once and search in the browser. That's fine for small teams but grows without bound. This spec loads those lists 50 at a time with a *Load more* button, and moves their search to the server.

- **Users:** team members browsing pages, diagrams, projects and board tickets.
- **Usage:**
  - **Pages and Diagrams screens (folder tree):**
    - All folders load at once, as today.
    - Root-level items load 50 at a time. Opening a folder loads its first 50 items, and later opens reuse what's already loaded.
    - Each level (root and each opened folder) ends with a *Load more* row while more items exist.
    - Items stay sorted by title within a level.
    - While a level loads, its *Load more* row shows a loading state. On error, the usual alert shows and *Load more* can be retried.
  - **Search on Pages and Diagrams:**
    - Typing in the search box searches the server after a 300 ms pause.
    - Results are a flat list (no folders, as today), 50 at a time with *Load more*, sorted by title.
    - Clearing the search returns to the tree as it was.
    - No results shows the existing empty state.
  - **Projects screen:** projects load 50 at a time, sorted by name, with *Load more* and the same debounced server search. The header project selector is unchanged: it still lists every project.
  - **Project detail page:** its Pages and Diagrams lists each load 50 at a time with their own *Load more*.
  - **Board List tab:**
    - Each status group (Backlog, then each column) loads its first 50 tickets in position order and has its own *Load more*.
    - Search, the assignee filter and the column filter run on the server (search debounced by 300 ms) and reset the loaded groups.
    - The Kanban tab is unchanged and still loads every ticket.
    - Selecting all for bulk actions selects the loaded tickets of that group only, and the selection bar shows the count.
  - **Live updates in the List tab** (with `live-board-updates.spec.md`):
    - Loaded tickets update or disappear in place.
    - A ticket created in, or moved into, a group appears if its position falls within that group's loaded range. Otherwise it appears later through *Load more*.
  - Creating, renaming, moving and deleting items keeps working on loaded data as today (apply the response locally). A newly created item appears in its level, in title order, even if that level isn't fully loaded.
- **Rules:**
  - Page size is 50 everywhere in this spec.
  - Ordering:
    - Pages, diagrams and projects by lowercase title or name, then id.
    - Tickets by position within their group.
  - The project selector filter and project visibility apply to every paginated request, as they do to the lists today.
- **Out of scope:**
  - The sidebar board list, which keeps loading every board for its personal order. There's no separate boards screen.
  - The Kanban tab.
  - Folders, Home, Favorites and My Work.
  - Global search, which already paginates.
  - The header project selector.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies.

## 2.2 Structure

**API conventions:**
- Offset pagination, like `SearchController`: `offset` (default 0) and a fixed page size of 50.
- Responses add `has_more` next to the list key.
- `ApplicationController` gets `PAGE_SIZE = 50` and a private `paginate(relation)` helper. It applies `offset(params[:offset].to_i).limit(PAGE_SIZE + 1)` and returns `[records.first(PAGE_SIZE), records.length > PAGE_SIZE]`.

**Endpoints:**
- `GET /teams/:code/pages` and `/diagrams`:
  - New params:
    - `folder_id`: a folder id, or `root` for items with no folder.
    - `search`.
    - `offset`.
  - With `search`, `folder_id` is ignored and results come from every folder (`search_title`).
  - Without `search` and without `folder_id`, the request means "all, flat". That serves the project detail page, which also passes `project_id`.
  - Ordered by `LOWER(title), id`.
  - Responds `{ pages: [...], has_more: }`.
- `GET /teams/:code/projects`:
  - `search` (name match through `text_search` or `search_title`, whichever the model supports; use `ILIKE` on name if neither fits) and `offset`.
  - Ordered by `LOWER(name), id`.
  - Responds `{ projects: [...], has_more: }`.
- New `GET /teams/:code/projects/options`: every project visible to the user, as `{ projects: [{ id, name }] }`, ordered by name. This is for `ProjectFilterService` and anything else that needs the full list.
- New `GET /teams/:code/boards/:board_id/tickets` (`TicketsController#index`):
  - Params:
    - `status`: `backlog` or a column id, required.
    - `search`.
    - `assignee_ids[]`.
    - `offset`.
  - Ordered by `position`, preloading what the ticket summary JSON uses.
  - Responds `{ tickets: [...], has_more: }`.
  - The column filter is applied on the client by choosing which groups to request, since a group is a column.
- Each list endpoint keeps a query-count test (1 and 10 items equal), and the new tickets index gets one.

**Frontend:**
- `FolderedItemService.list(teamCode, { folderId, search, projectId, offset })` returns `{ items, hasMore }`.
- `ProjectService.listProjects(teamCode, { search, offset })` returns `{ projects, hasMore }`.
- New `ProjectService.listProjectOptions(teamCode)`.
- New `TicketService.list(teamCode, boardId, { status, search, assigneeIds, offset })`.
- `ProjectFilterService` switches to `listProjectOptions`.
- `FolderedListPageComponent` (`pages/dashboard/foldered-list-page.base.ts`) and `item-tree`:
  - Per-level loaded items and `hasMore`, keyed by `root` or the folder id.
  - Opening a folder in `item-tree` emits an event so the page loads that level once.
  - A *Load more* row per level.
  - The debounced server search replaces the client-side filter in `displayItems`.
- `project-detail`: paginated Pages and Diagrams with *Load more*.
- `projects`: paginated list with *Load more* and the debounced server search.
- `ListTabComponent`:
  - Loads its groups through `TicketService.list` instead of reading `BoardPageStateService` tickets.
  - Keeps per-group tickets and `hasMore`.
  - Search and filters trigger a reload of the groups.
  - Select-all is per group, over loaded tickets.
  - With `live-board-updates`, `BoardChannelService` also notifies the List tab (an observable of ticket upserts and removals), which applies the in-range rule from Part 1.
  - `ListRowComponent` and `TicketSelectionBarComponent` are unchanged apart from inputs.
- i18n: a *Load more* label (shared) in `PHRASES` and every translation file.

## 2.3 Decisions
1. **Which lists?** Pages, Diagrams, Projects and the List tab tickets. The boards list was dropped: there's no boards screen and the sidebar keeps loading all boards. (2026-10-26)
2. **The folder tree?** Pagination per folder level with *Load more*; folders always load in full. Rejected: flat pages filling the tree. (2026-10-26)
3. **Search?** Server-side, debounced by 300 ms, using `search_title`. Rejected: keeping client-side filtering of loaded items. (2026-10-26)
4. **Page size and style?** 50, with a *Load more* button. Rejected: infinite scroll, and a page size of 25. (2026-10-26)
5. **Sidebar boards?** Keep loading all (personal order). (2026-10-26)
6. **Projects?** Only the Projects screen paginates. The header selector gets a lightweight all-projects request (`projects/options`). (2026-10-26)
7. **Project detail lists?** Paginated, 50 with *Load more* each. (2026-10-26)
8. **List tab groups?** 50 per status group through a new tickets index endpoint; Kanban keeps loading all. Rejected: one stream filling the groups. (2026-10-26)
9. **Live updates in the List tab?** Loaded tickets update in place; incoming tickets are inserted only within the loaded range. Rejected: reloading groups. (2026-10-26)
10. **Bulk select-all?** Loaded tickets only. Rejected: server-side "select all matching". (2026-10-26)
11. **Endpoint name for the full project list?** `GET /teams/:code/projects/options`. (2026-10-26, recorded while writing the spec; confirm during review)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` and `npm test` and note the counts.

### A. API
- [ ] A1. Add `PAGE_SIZE` and `paginate` to `ApplicationController`.
- [ ] A2. Pages and diagrams index: `folder_id` (`root` or id), `search`, `offset`, ordering, and `has_more`. Controller tests:
  - The root level excludes foldered items.
  - A folder level returns only that folder.
  - Search crosses folders.
  - `offset` returns the next page and `has_more` flips at the end.
  - Project filter and visibility still apply.
  - The query-count test still passes.
- [ ] A3. Projects index pagination and search, plus the `projects/options` route and action. Tests:
  - Ordering, `offset` and `has_more`.
  - Search.
  - `options` returns every visible project and hides projects the user can't see.
- [ ] A4. Add `TicketsController#index` with the route. Tests:
  - Backlog and column groups.
  - Search and assignee filters.
  - Position order, `offset` and `has_more`.
  - Access checks (project visibility, `FEATURE_DISABLED`).
  - A query-count test.

### B. Frontend data layer
- [ ] B1. Update `FolderedItemService.list`, `ProjectService.listProjects` and add `listProjectOptions`; switch `ProjectFilterService` to `listProjectOptions`. Update their specs and `testing/projectFilterStub.ts` as needed.
- [ ] B2. Add `TicketService.list`, with spec tests.

### C. Screens
- [ ] C1. Pages and Diagrams: per-level loading, *Load more* rows and the open-folder event in `item-tree`. Spec tests:
  - Root loads on init.
  - Opening a folder loads it once.
  - *Load more* appends.
  - A created item lands in its level.
- [ ] C2. Pages and Diagrams debounced server search replacing `displayItems` filtering. Spec tests with fake timers: one request after 300 ms; clearing restores the tree.
- [ ] C3. Projects screen pagination and search. Project detail paginated Pages and Diagrams lists. Spec tests.
- [ ] C4. List tab: per-group loading through `TicketService.list`, server search and filters, *Load more* per group, select-all over loaded tickets. Update `boardFixtures.ts` and the List tab specs.
- [ ] C5. If `live-board-updates` is implemented: the List tab applies upserts and removals with the in-range rule. Spec tests: an in-range insert appears, an out-of-range insert doesn't, and a removal disappears. If it isn't implemented yet, add this task to that spec instead.
- [ ] C6. Add the *Load more* `PHRASES` key and translations to every file in `public/assets/translations/`.

### D. Docs
- [ ] D1. Update the root `CLAUDE.md`:
  - List screens: "List screens load once and apply each mutation's response locally" and "Pages and Diagrams search filters loaded items in the browser" become the paginated, server-search behaviour.
  - Routes: the tickets index and `projects/options`.
  - `TitleSearchable` is no longer "kept for future pagination".

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md`.
- [ ] Z2. Manual check in the running app, with seeded data of more than 50 pages in one folder, more than 50 projects and more than 50 backlog tickets:
  - *Load more* works at the root and inside a folder.
  - Search finds an item that isn't loaded yet.
  - The project selector still lists every project.
  - In the List tab, *Load more* works in Backlog, and the filters reset the groups.
