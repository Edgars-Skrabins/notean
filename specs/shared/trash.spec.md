# Trash — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-28

# Part 1 — Business logic and usage

Today deleting a page, diagram, board, ticket or folder removes it at once and for good. With this feature a delete moves the item to the team's trash instead. Trashed items disappear from everywhere in the app, can be restored from a new Trash screen for 14 days, and are then deleted automatically by a daily job. The Trash screen is a new entry at the bottom left of the dashboard sidebar.

- **Users:** every team member. Anyone who deleted something by mistake restores it themselves; owners and admins can also empty the trash.
- **Usage:**
  1. A member deletes a page, diagram, board, ticket (single, bulk or through a column delete) or folder. The existing confirm dialogs stay, reworded from "Delete" to "Move to trash". After the delete a toast says "Moved to trash" with an **Undo** button; Undo restores what that action trashed (all tickets of a bulk or column delete at once).
  2. The item vanishes from its list, the sidebar, search, favorites, My Work and from other members' screens (boards and tickets live, as today's deletes do).
  3. The sidebar shows a **Trash** entry (trash icon) at the bottom left, above the collapse toggle, also in the collapsed sidebar with a tooltip. It opens `/dashboard/trash`.
  4. The Trash screen lists trashed items newest first, 50 at a time with *Load more*. Each row shows the type icon, the title, context (a ticket's board, a folder's item count), who deleted it, when, and how many days are left before it is deleted for good. Each row has **Restore** and **Delete forever** (Delete forever asks for confirmation).
  5. The list follows the header's project selector, has a type filter (pages, diagrams, boards, tickets, folders) and a title search (server side, debounced 300 ms).
  6. Owners and admins see an **Empty trash** button, which asks for confirmation and deletes every listed item for good.
  7. Empty state: "Trash is empty" with a line saying items are kept for 14 days. Loading and error states follow the other list screens.
  8. Restoring an item another member already restored or deleted for good fails with a not-found toast and the row is dropped. The screen doesn't update live.
- **Rules:**
  - **What goes to the trash:** pages, diagrams, boards, tickets and folders. Projects and columns don't.
  - **Children:** a trashed folder (cascade mode) takes its subfolders, pages and diagrams with it, and a trashed board takes its tickets, columns and priorities. They form one trash entry, listed only as the parent, and restore with it. Children can't be restored on their own.
  - **Folder promote mode:** the contents move up as today and the now empty folder is deleted for good, not trashed.
  - **Columns:** deleting a column deletes the column for good and moves each of its tickets to the trash as its own entry. Restored, those tickets go to the end of the backlog.
  - **Bulk ticket delete:** one trash entry per ticket.
  - **Projects:** deleting a project in *keep* mode is unchanged. In *delete items* mode, the project's top-level pages, diagrams, boards and folders each go to the trash as their own entry with the project cleared, so they are visible team-wide in the trash; the project itself is deleted for good.
  - **Visibility:** a trashed item is visible in the trash, and restorable, by exactly the people who could see it live: everyone for items without a project, project members plus the team owner and admins for project items. A trashed item of a feature that is switched off is hidden from the trash, like the feature's other items.
  - **Permanent delete:** anyone who can restore an entry can delete it forever. *Empty trash* is owner and admin only and deletes every trash entry of the team whose feature is on, regardless of the project selector, type filter and search.
  - **Restore placement:** an item returns to its original folder and project. If its folder was deleted for good or is itself in the trash, it returns to the top level of its list (keeping its project). A restored ticket goes to the end of its original column, or of the backlog if that column is gone.
  - **Ticket of a trashed board:** a ticket trashed on its own whose board was trashed afterwards can't be restored until the board is restored (error "Restore the board first"). Restoring the board doesn't bring that ticket back; it stays its own entry.
  - **Retention:** an entry is deleted for good 14 days after it was trashed, by a daily job, regardless of feature flags. Deleting a board or folder for good also deletes its children and any separately trashed tickets, pages, diagrams and folders inside it.
  - **While trashed:** a trashed item behaves as if deleted: opening its URL gives the existing not-found handling, its editing channel rejects subscriptions, it is not in lists, search, My Work, favorites or the project counts, and it can't be edited, moved or favorited. Its favorites are kept hidden and return on restore; they go when the item is deleted for good. Its ticket assignees, contributors and comments are kept and return with it.
  - Removing a member or changing a project still cleans up their assignments on trashed tickets, so a restored ticket never shows someone who lost access.
- **Out of scope:**
  - Trashing projects, columns, priorities, teams or accounts (each keeps its current delete).
  - A read-only "in trash" view of an item; restoring happens only from the Trash screen.
  - Live updates of the Trash screen.
  - Configurable retention; it is fixed at 14 days.
  - Comments and attachments going to the trash on their own (see Related specs).

### Related specs

- **comments:** comments and diagram comment pins are hard-deleted on their own and stay attached to a trashed page, diagram or ticket; they are deleted with it when it is deleted for good. A later change may route comment deletes through the trash.
- **attachments:** files on a trashed ticket or page stay until the item is deleted for good; the purge must remove their blobs. Attachment deletes may later go through the trash too.
- **notifications-inbox:** moving an item to the trash calls `Notifier.item_deleted` / `items_deleted` (owners get a "moved to trash" row; earlier rows about the item are deleted); restoring sends nothing. Purging deletes the item's notifications. Whichever spec is merged second wires this (decided 2026-10-28; see that spec's Related specs).
- **attachments:** the attachments spec's `Attachment.purge_stale_pending` runs as a second recurring Solid Queue job next to `PurgeTrashJob`; whichever spec is merged second adds it.
- **mentions:** `@item` mentions of a trashed item render as unavailable; the mention dropdown never offers trashed items (the default scope does this).
- **copy-link:** a copied link to a trashed item gives the normal not-found handling.
- **templates:** templates live in their own table and are not trashable; deleting one is permanent (decided in the templates spec, 2026-10-28). Items created from a template go to the trash as usual.
- **chat:** chat messages and channels are not covered by this spec.

# Part 2 — Technical details

## 2.1 Tools and libraries

- New gem: `solid_queue` (`~> 1.2`), the Rails 8 database-backed Active Job backend, for the daily purge as a recurring job. Its tables live in the main database. No other new dependency.
- Frontend: existing stack only (axios through `apiRequest`, ngx-translate, existing shared components).

## 2.2 Structure

### Data model

All in the single `create_schema` migration (the project rebuilds the database instead of adding migrations), plus `db/schema.rb`.

- New table `trash_entries`: `team_id` (FK), `item_type` (string: `Page`, `Diagram`, `Board`, `Ticket`, `Folder`), `item_id` (bigint), `title` (string, copy of the item's title for search and display), `project_id` (FK, nullable, `on_delete: :nullify`; the item's project, or the board's for a ticket), `deleted_by_user_id` (FK to users), `created_at` (the trash time). Indexes: `(team_id, created_at)`, `(item_type, item_id)` unique, `created_at`, and a `pg_trgm` GIN index on `LOWER(title)`.
- `trash_entry_id` (bigint, FK to `trash_entries`, nullable, indexed) on `pages`, `diagrams`, `boards`, `tickets` and `folders`. Set on the trashed item and on every child hidden with it; null means live.
- Solid Queue tables (from `solid_queue`'s `queue_schema.rb`) added to the same migration.

### Models

- `TrashEntry` (`app/models/trash_entry.rb`): `belongs_to :team`, `belongs_to :project, optional: true`, `belongs_to :deleted_by, class_name: "User", foreign_key: :deleted_by_user_id`, `belongs_to :item, polymorphic: true` (loaded `unscoped`). Includes `TitleSearchable`. Constants `ITEM_TYPES`, `RETENTION = 14.days`, `TYPE_FEATURES` (`Page` → `:pages`, `Diagram` → `:diagrams`, `Board`/`Ticket` → `:boards`, `Folder` → its `item_type`'s feature). `purge_at` = `created_at + RETENTION`. Scope `expired`.
- `Trashable` concern (`app/models/concerns/trashable.rb`) included in `Page`, `Diagram`, `Board`, `Ticket`, `Folder`: `default_scope { where(trash_entry_id: nil) }`, `belongs_to :trash_entry, optional: true`, `trashed?`. Every existing query and association therefore skips trashed rows; trash code reaches them with `unscoped` (`Model.unscoped { ... }` or `Model.unscoped.where(...)`).
- `Trash` service (`app/models/trash.rb`), plain Ruby like `MembershipRemoval`:
  - `Trash.move(item, user)` creates the entry and stamps `trash_entry_id` on the item and its children in a transaction with `update_all` (no `lock_version` bump):
    - `Page`/`Diagram`: the item.
    - `Folder`: the folder, all descendant folders and the pages or diagrams in them.
    - `Board`: the board and its live tickets (columns and priorities aren't trashable; they are hidden because the board is).
    - `Ticket`: the ticket, then `TicketPositions.shift` closes its gap as the current delete does. The row keeps its `column_id` and stale `position`.
  - `Trash.move_tickets(board, tickets, user)` for bulk and column deletes: one entry per ticket, gaps closed with `TicketPositions.close_gaps`.
  - `Trash.restore(entry)` clears `trash_entry_id` on every row with that entry, then fixes placement: a page, diagram or folder whose `folder_id`/`parent_id` points at a missing or trashed folder moves to the top level; a ticket whose column is gone goes to the backlog and is appended with `TicketPositions.append` (after the stamp is cleared, since `append` reads through the default scope). A ticket whose board is trashed raises an error rendered as 422 `TRASH_BOARD_IN_TRASH`. Destroys the entry.
  - `Trash.purge(entry)` deletes the item for good with `unscoped` queries: for a board or folder it first purges other entries for items inside it (separately trashed tickets of the board; pages, diagrams and folders in the folder tree), then destroys the item and its children, then the entry. Children are destroyed through `unscoped` relations because the default-scoped associations no longer reach trashed rows.
- Associations and cleanup that must reach trashed rows (each a `before_destroy` or an `unscoped` query):
  - `Team#destroy`: purge all its trash entries first.
  - `Project` destroy: nullify `project_id` on trashed pages, diagrams, boards and folders with `unscoped` `update_all` (the default-scoped `dependent: :nullify` misses them).
  - `Column` destroy: the controller trashes its live tickets first; then nullify `column_id` on its trashed tickets (`unscoped` `update_all`) before the column row goes.
  - `BoardPriority`: the `tickets.priority_id` FK already nullifies on delete; the `priorities_changed` broadcast stays limited to live tickets.
  - `MembershipRemoval`: assignee cleanup uses `Ticket.unscoped.where(team: team)`.
  - `ProjectAccessCleanup.for_board`: assignee cleanup over `Ticket.unscoped.where(board: board)`.
  - `FolderProject.apply`: unchanged (trashed rows can't be moved).

### Background job

- `config.active_job.queue_adapter = :solid_queue` in development and production, `:test` stays in test.
- `config/queue.yml` and `config/recurring.yml` (from `bin/rails solid_queue:install`, trimmed to the main database). `recurring.yml` runs `PurgeTrashJob` every day at 03:00 in development and production.
- `config/puma.rb`: `plugin :solid_queue`, so the job runner runs inside `bin/rails server` and no extra process is needed.
- `PurgeTrashJob` (`app/jobs/purge_trash_job.rb`, plus `ApplicationJob`): `TrashEntry.expired.find_each { |entry| Trash.purge(entry) }`.

### API

`TrashController` (`app/controllers/trash_controller.rb`), team-scoped (`set_team`, `authorize_team_member!`), with strong params in `ApplicationController` and codes in `app/errors/error_codes/trash.rb` (`ErrorCodes::Trash`).

| Endpoint | Behaviour |
|---|---|
| `GET /teams/:team_code/trash` | Params `offset`, `type` (`page`, `diagram`, `board`, `ticket`, `folder`), `search` (title), `project_id`. Entries visible to the user (`project_access` on `project_id`), enabled features only, newest first, paginated with `paginate`. Responds `{ trash_entries: [...], has_more }`. |
| `POST /teams/:team_code/trash/restore` | `{ trash: { entry_ids: [...] } }`. All-or-nothing: an invisible or missing id is 404 `TRASH_ENTRY_NOT_FOUND`; a ticket of a trashed board is 422 `TRASH_BOARD_IN_TRASH`. Responds `{ restored: [{ item_type, item_id }] }`. |
| `DELETE /teams/:team_code/trash/:id` | Purge one visible entry. 204, or 404 `TRASH_ENTRY_NOT_FOUND`. |
| `DELETE /teams/:team_code/trash` | Owner and admin only (`require_team_role!`). Purges every entry of the team whose type's feature is on. 204. |

Entry JSON (`trash_entry_json`): `id`, `item_type`, `item_id`, `title`, `project_id`, `board` (`{ id, title }` for tickets), `children_count` (pages, diagrams and subfolders for a folder; tickets for a board), `restorable` (false for a ticket of a trashed board), `deleted_by` (`member_json`, using the team nickname also for removed members), `deleted_at`, `purge_at`. The index preloads what it renders, with a query-count test.

Changed delete endpoints call `Trash` instead of destroying and respond `200 { trash_entry_ids: [...] }` instead of 204 (used by Undo):

- `PagesController#destroy`, `DiagramsController#destroy`, `BoardsController#destroy` (still broadcasts `board_deleted`), `TicketsController#destroy` and `#bulk_destroy` (still broadcast `tickets_shifted` then `tickets_removed`), `FoldersController#destroy` in `cascade` mode (`promote` keeps destroying the empty folder and stays 204), `ColumnsController#destroy` (trashes the tickets, broadcasts `tickets_removed` for them and `columns_changed`), `ProjectsController#destroy` in `delete_items` mode (clears the project on the top-level items with `FolderProject.apply`-style updates, then trashes each one; still 204, no Undo since the project is gone).

Restore broadcasts: tickets restored onto a live board send `tickets_upserted` (with description) on `BoardChannel`. A restored board sends nothing (nobody is subscribed to it).

### Channels

- `EditingChannel#subscribed` finds the item through the default scope, so trashed pages and diagrams are rejected with no change; covered by a test.
- `BoardChannel` likewise rejects a trashed board.

### Frontend

- `AppRoutes.TRASH = 'trash'`, added to `dashboardRoutes` as `TrashComponent` (no feature guard).
- `DashboardSidebarComponent`: a Trash link with `app-icon name="trash"` at the bottom of the nav, above the collapse toggle, with the tooltip and `aria-label` pattern of the other entries.
- `models/trash.model.ts`: `TrashEntry`, `TrashItemType`, `TrashListResponse`, `mapTrashEntry`.
- `services/trash.service.ts` (`providedIn: 'root'`): `list`, `restore(entryIds)`, `deleteForever(id)`, `empty()`, all through `apiRequest` and `teamPath`, returning `Result`. Takes the project with `projectQuery`.
- `pages/dashboard/trash/` `TrashComponent`: list with `LoadMoreComponent`, `TicketFilterComponent`-style type `app-dropdown`, debounced search input (`.textInput`), rows with Restore and Delete forever (`app-icon-button` with tooltips), *Empty trash* (`app-button`) for owner and admin (`TeamService` role), confirmations through `ConfirmDialogComponent`, follows `ProjectFilterService`. A restore error `TRASH_ENTRY_NOT_FOUND` drops the row with a toast; `TRASH_BOARD_IN_TRASH` shows the error and the row shows "Board is in the trash" whenever `restorable` is false. If the stylesheet outgrows the budget, split the row into `TrashRowComponent`.
- Toast actions: `ToastOptions` gets an optional `action?: { label: string; run: () => void }`; `ToastComponent` renders it as a button that runs it and dismisses the toast. A toast with an action stays `TOAST_ACTION_DURATION_MS` (6000 ms).
- Delete callers (`PageService`/`DiagramService` via `FolderedItemService`, `FolderService`, `BoardService`, `TicketService` single and bulk, `ColumnService`) map the new `trash_entry_ids`; the screens that delete show the "Moved to trash" toast with Undo calling `TrashService.restore`, then re-insert the restored item by reloading the affected list or level (boards: the live `tickets_upserted` broadcast and `BoardListService` reload).
- Existing delete confirm phrases are reworded to "Move to trash"; new phrases in `PHRASES` and all eleven translation files: `TRASH`, `TRASH_EMPTY`, `TRASH_EMPTY_HINT`, `MOVED_TO_TRASH`, `UNDO`, `RESTORE`, `DELETE_FOREVER`, `CONFIRM_DELETE_FOREVER`, `EMPTY_TRASH`, `CONFIRM_EMPTY_TRASH`, `TRASH_DELETED_BY`, `TRASH_DAYS_LEFT`, `TRASH_BOARD_IN_TRASH_HINT`, `TRASH_TYPE_ALL`, `ITEM_RESTORED`.
- `config/errorCodes/trash.ts` (`TRASH_ENTRY_NOT_FOUND`, `TRASH_BOARD_IN_TRASH`), exported from `index.ts`, with `ERRORS.TRASH.*` translations.

### Docs

`CLAUDE.md`: trash routes, `Trashable` default scope and the `unscoped` rule, `Trash` service, Solid Queue and the recurring purge, the new delete responses, and the Trash screen. `README.md` if it lists processes or setup steps that change.

## 2.3 Decisions

1. **Trashable types:** pages, diagrams, boards, tickets and folders. Projects and columns are not trashed.
2. **Columns:** a column delete removes the column for good and trashes its tickets individually; they restore to the backlog end. Rejected: trashing the column as a unit; leaving column deletes permanent.
3. **Children:** a folder's or board's contents form one entry with the parent and restore together. Rejected: one entry per child (noisy, children restored into nothing).
4. **Access:** anyone who could see the item live can see, restore and delete it forever. Rejected: deleter plus managers; managers only.
5. **Project delete with delete_items:** the project's top-level items go to the trash with the project cleared. Rejected: hiding them from non-managers; keeping the hard delete.
6. **Permanent delete:** per entry by anyone who can restore it; *Empty trash* by owner and admin only. Rejected: managers-only per item; no manual purge.
7. **Restore placement:** to the top level when the folder is gone or trashed. Rejected: blocking the restore until the folder is back.
8. **Restored ticket position:** end of its original column, else backlog end. Rejected: original position (shifts siblings); always backlog.
9. **Purge runner:** Solid Queue recurring job inside Puma. Rejected: rake task plus external cron (nothing runs in dev); lazy purge on request (rows linger).
10. **Storage:** a `trash_entries` table plus `trash_entry_id` on the five tables, following the soft-delete idea of `deleted_at`/`removed_at` but with one row per delete so the trash lists, restores and purges from one table. Rejected: `deleted_at` columns only (union over five tables, roots vs children unclear).
11. **Favorites:** kept but hidden while trashed, back on restore. Rejected: removing them on trash.
12. **Delete UX:** existing confirms stay, reworded; a toast with Undo follows. Rejected: dropping the confirms; a toast without Undo.
13. **Opening a trashed item:** not found, as today. Rejected: a read-only "in trash" view.
14. **Trash screen:** follows the project selector, with a type filter and title search.
15. **Folder promote mode:** the empty folder is deleted for good, not trashed.
16. **Filtering:** `default_scope { where(trash_entry_id: nil) }` on the five models so every existing query is covered; trash code uses `unscoped`. Rejected: an explicit `kept` scope everywhere (easy to miss one).
17. **Bulk and column deletes:** one entry per ticket; Undo restores them together. Rejected: one group entry per action.
18. **Live updates:** the Trash screen loads on open only. Rejected: a `trash_changed` TeamChannel broadcast.
19. **Ticket of a trashed board:** restoring it is blocked until the board is restored, and the board's restore doesn't bring it back. Rejected: folding it into the board's entry.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: record the current `bin/rails test` and `npm test` counts here.

### A. Data model and Solid Queue

- [ ] A1. Add `solid_queue` (`~> 1.2`) to `backend/Gemfile`, `bundle install`, and run `bin/rails solid_queue:install`; move the queue tables into `db/migrate/20261026120000_create_schema.rb` (main database, no separate `queue` database), keep `config/queue.yml` and `config/recurring.yml`, drop any generated multi-database config. Set `config.active_job.queue_adapter = :solid_queue` in development and production and add `plugin :solid_queue` to `config/puma.rb`.
- [ ] A2. In the same migration add `trash_entries` with its columns, FKs and indexes (including the `pg_trgm` GIN index on `LOWER(title)`), and `trash_entry_id` with FK and index on `pages`, `diagrams`, `boards`, `tickets`, `folders`. Rebuild the dev and test databases and update `db/schema.rb`.
- [ ] A3. Add the `Trashable` concern and include it in the five models; add `TrashEntry` with associations, `TitleSearchable`, `RETENTION`, `TYPE_FEATURES`, `purge_at` and `expired`. Model tests: default scope hides stamped rows, `expired` picks entries older than 14 days.
- [ ] A4. Make destroy paths reach trashed rows: `Team` purges its entries before destroy, `Project` nullifies `project_id` on trashed rows, `Column` nullifies `column_id` on trashed tickets, `MembershipRemoval` and `ProjectAccessCleanup` use `Ticket.unscoped`. Tests for each (team delete with trashed items, project delete with a trashed page, member removal clears an assignment on a trashed ticket).

### B. Trash service and job

- [ ] B1. `Trash.move` for page, diagram, folder (whole tree), board (with tickets) and ticket (closing the position gap), and `Trash.move_tickets` for many tickets. Tests: children stamped, positions stay dense, `lock_version` unchanged.
- [ ] B2. `Trash.restore` with placement rules (folder gone or trashed → top level; column gone → backlog; append to the end) and the trashed-board error. Tests for each case, including positions after restore.
- [ ] B3. `Trash.purge`, including nested entries inside a board or folder and child rows reached with `unscoped`. Tests: rows gone, separately trashed ticket of a purged board gone, favorites of the item gone.
- [ ] B4. `ApplicationJob`, `PurgeTrashJob` and its `config/recurring.yml` entry (daily at 03:00). Job test with an expired and a fresh entry.

### C. API

- [ ] C1. `ErrorCodes::Trash`, routes, strong params and `TrashController#index` (visibility, feature filter, type, search, project, pagination, entry JSON with preloads). Tests including a query-count test and a project-visibility test.
- [ ] C2. `TrashController#restore`, `#destroy` and `#empty` (owner and admin only). Tests: all-or-nothing restore, 404 for another project's entry, 403 for a `user` on empty, `tickets_upserted` broadcast on ticket restore.
- [ ] C3. Switch `PagesController`, `DiagramsController`, `BoardsController` and `FoldersController` (cascade mode) deletes to `Trash.move` with the `trash_entry_ids` response; promote mode stays a hard delete. Update their controller tests.
- [ ] C4. Switch `TicketsController#destroy`/`#bulk_destroy` and `ColumnsController#destroy` to trash tickets, keeping their broadcasts. Update their tests.
- [ ] C5. `ProjectsController#destroy` in `delete_items` mode trashes the top-level items with the project cleared. Update its tests.
- [ ] C6. Tests that trashed items are absent from pages, diagrams, boards and tickets indexes, search, favorites, My Work and project counts, and that editing channels and `BoardChannel` reject trashed items. Fix any query that still leaks them.

### D. Frontend data layer

- [ ] D1. `config/errorCodes/trash.ts`, `models/trash.model.ts` with `mapTrashEntry`, and `TrashService` with specs.
- [ ] D2. Map `trash_entry_ids` from the changed delete calls in `FolderedItemService`, `FolderService`, `BoardService`, `TicketService` and `ColumnService`; update their specs.
- [ ] D3. Toast actions: `action` on `ToastOptions`, the button in `ToastComponent`, `TOAST_ACTION_DURATION_MS`. Specs in `toast.service.spec.ts`.

### E. Screens

- [ ] E1. `AppRoutes.TRASH`, the route in `dashboardRoutes`, and the sidebar entry at the bottom of `dashboard-sidebar`.
- [ ] E2. `TrashComponent` (generated with `npm run newcomponent`): list, load more, type filter, search, project selector, restore, delete forever, empty trash, empty and error states. Component spec for restore removing the row and the not-found case.
- [ ] E3. "Moved to trash" toast with Undo after deleting pages, diagrams, folders, boards, tickets (single, bulk, column); Undo restores and the item reappears. Reword the delete confirm phrases.
- [ ] E4. New phrases and error translations in `PHRASES` and all eleven translation files.

### Z. Wrap-up

- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`bin/rails test`, `bin/rubocop`, `bin/brakeman`, `npm test`, `npm run build`).
- [ ] Z2. Update `CLAUDE.md` (and `README.md` if setup changes) as listed in Part 2.
- [ ] Z3. Manual check in the running app: delete a page, Undo it; delete a folder with pages and restore it from Trash; delete a ticket on a board open in a second browser and watch it vanish, then restore it to the column end; delete a board, check the sidebar and search, restore it; delete forever and empty trash as owner; confirm a `user` role doesn't see Empty trash and can't see another project's trashed items.
