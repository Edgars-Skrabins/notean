# Board List tab — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

A board's Backlog tab is a plain list of the tickets that aren't on the board. It becomes the **List** tab: every ticket of the board, grouped by status, with search, filters, multi-select bulk actions and richer rows.

- **Users:** everyone who can see the board.
- **Concepts:**
  - **Status:** a ticket's status is **Backlog** when it has no column, otherwise the column's title. The available statuses are Backlog plus the board's columns in board order. A ticket created in the List tab starts as Backlog.
- **Usage:**
  - **Tab:**
    - The third board tab is labelled **List** and lives at `/dashboard/boards/:id/list`.
    - The old `/backlog` URL redirects to `/list` (including `/backlog/tickets/:ticketId`), so old links and favorites still work.
  - **Groups:**
    - The tickets are shown in collapsible groups, one per status in board order: Backlog first, then each column.
    - Each group header shows the status name, a ticket count, a select-all checkbox for the group's visible tickets and a collapse chevron. All groups start expanded, and collapse state isn't saved.
    - Empty groups still show their header, with "No tickets".
  - **Rows:**
    - Each row shows a selection checkbox, the title, the status, the creation date, small assignee avatars and the row actions.
    - The row actions are favorite, "Move to board" (Backlog tickets only, as today) and delete.
    - Clicking the row opens the ticket popup.
  - **Ordering and dragging:** within a group, tickets keep their position (the same order as the Kanban column). Dragging a row reorders it within its group. Dragging between groups isn't possible; use the status action instead.
  - **Creating:** "Create ticket" sits at the bottom of the Backlog group, and creates a Backlog ticket as today.
  - **Search:** a search input above the groups filters by title (case-insensitive, contains), instantly, in the browser.
  - **Filter:**
    - A filter button next to the search opens a panel with two multi-select sections:
      - **Assignee:** every member who can see the board, plus "Unassigned"
      - **Status:** Backlog and each column
    - Sections combine with AND, and choices within a section with OR. Search and filters combine.
    - The button shows a badge with the number of active choices. "Clear" resets the filters.
    - Groups whose status is filtered out are hidden. Filters reset when leaving the tab.
  - **Selection and bulk actions:**
    - Ticking one or more rows shows a selection bar above the list: "N selected", then:
      - **Set status:** a dropdown of Backlog and the columns. Moves all selected tickets there, appended to the end in their current list order.
      - **Assign:** a member picker that adds that member to all selected tickets (no-op where they're already assigned).
      - **Unassign:** a member picker of members assigned to any selected ticket, which removes them from all.
      - **Delete:** deletes all selected tickets after one confirmation ("Delete N tickets?").
      - **Clear selection.**
    - After an action, the list updates in place and the selection clears.
    - On failure nothing changes (all or nothing), the selection stays and an error toast shows.
    - Selected tickets that become hidden by search or filters stay selected and still count.
  - **Tooltips:** every icon-only action in the rows, group headers and selection bar uses `app-icon-button` with a tooltip phrase. `tooltips.spec.md` makes these tooltips visible and styled.
  - **Empty board:** when the board has no tickets at all, a message shows: "No tickets yet" (it replaces "The backlog is empty").
- **Rules:**
  - Bulk endpoints only accept tickets of this board. If any id isn't on the board, the whole request fails with `TICKET_NOT_FOUND`.
  - Assignees must be team members who can see the board, the same rule as single assignment.
  - Kanban shows the same tickets and positions. Moving a ticket's status here is the same as moving it between columns there.
- **Out of scope:**
  - Tags (they don't exist yet). The filter panel is built so a Tags section can be added later.
  - Priority (`ticket-priorities.spec.md`).
  - Sorting by columns.
  - Saving filters or collapse state.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing Angular, CDK drag-drop and overlay, `app-dropdown`, `app-checkbox`, `app-avatar-stack`, `BoardPageStateService`, Rails tickets controller. No new dependencies.

## 2.2 Structure

### Backend
- **`TicketJson#ticket_summary_json`:** add `created_at`.
- **Routes**, inside `resources :tickets`:
  ```ruby
  collection do
    patch :bulk, action: :bulk_update
    delete :bulk, action: :bulk_destroy
  end
  ```
- **`TicketsController#bulk_update`** (`bulk_ticket_params` in `ApplicationController`):
  - Params: `ticket_ids` (array, required) and exactly one of `column_id`, `to_backlog: true`, `add_assignee_id` or `remove_assignee_id`.
  - Loads `@board.tickets.where(id: ticket_ids)`. If the count differs from `ticket_ids.uniq` → `TICKET_NOT_FOUND` 404.
  - Status: appends the tickets to the target in the order of `ticket_ids` (positions after the current max) and reindexes the source groups. An unknown column → `COLUMN_NOT_FOUND`.
  - Assign: validate the user like `TicketAssigneesController#create` (extract that check into a shared private method or the `BoardScoped` concern). `find_or_create_by` per ticket. Unassign: `destroy` where present.
  - Runs in one transaction.
  - Responds `{ tickets: [ticket_summary_json...] }` with preloads so the query count doesn't grow.
- **`TicketsController#bulk_destroy`:** `ticket_ids`, the same all-or-nothing check, then `destroy` in a transaction, reindexing remaining positions per group. Responds 204.
- **New error code:** `BULK_ACTION_INVALID` in `ErrorCodes::Tickets` (none or several actions given, or `ticket_ids` empty), 422.
- **Tests** (`tickets_controller_test.rb`):
  - each action works
  - status appends in the given order
  - a foreign ticket id fails everything
  - a non-member assignee fails
  - an invalid action combination returns 422
  - delete removes all
  - query count equal for 1 and 10 tickets

### Frontend
- **Routes:**
  - `AppRoutes.BACKLOG` becomes `AppRoutes.LIST = 'list'`.
  - Add a redirect route `backlog` → `list` and `backlog/tickets/:ticketId` → `list/tickets/:ticketId`.
  - `utils/ticketRoute.ts` uses `LIST` (the parameter can be renamed from `inBacklog` to `inList` but keeps its meaning: open in the List tab rather than Kanban).
  - Update every caller and spec.
- **Rename:**
  - `pages/dashboard/backlog-tab/` → `pages/dashboard/list-tab/` (`ListTabComponent`)
  - `components/backlog-row/` → `components/list-row/` (`ListRowComponent`)
  - CSS blocks `listTab` and `listRow`
- **Models:**
  - `TicketSummary` gets `createdAt`.
  - A `TicketStatus` view model `{ columnId: number | null; title: string }` built from the board.
- **`BoardPageStateService`:**
  - `statuses` (Backlog plus the columns)
  - `ticketsByStatus()`
  - `applyTickets(tickets)`, which places updated summaries into the right column or the backlog arrays by `columnId` and `position`
  - `removeTickets(ids)`
- **`TicketService`:**
  - `bulkUpdate(teamCode, boardId, ticketIds, action)`, with `action` one of `{columnId}`, `{toBacklog: true}`, `{addAssigneeId}` or `{removeAssigneeId}`
  - `bulkDelete(teamCode, boardId, ticketIds)`
  - Both use `apiRequest`. Extend `ticket.service.spec.ts`.
- **`ListTabComponent`:**
  - groups with collapse state
  - `searchQuery`
  - `filters: {assigneeIds: Set<number | 'none'>, columnIds: Set<number | null>}`
  - `selectedIds: Set<number>`
  - a computed visible tickets per group
  - drag within a group (the existing reorder call)
  - create in Backlog
  - a selection bar and bulk handlers that call the service and then `state.applyTickets` or `removeTickets`
  - the delete confirmation
- **`components/ticket-filter/`** (`TicketFilterComponent`): the filter button with a badge, and a CDK overlay panel with checkbox sections (assignee, status). It emits the filter state.
- **`ListRowComponent`:** checkbox, title button filling the row, status label, `createdAt | date`, `app-avatar-stack`, actions. Inputs `ticket`, `statusTitle` and `selected`. Outputs `opened`, `selectedChange`, `moveToBoard` and `deleteTicket`.
- **Phrases** (in `PHRASES` and every translation file):
  - `TAB_LIST` ("List") replaces `TAB_BACKLOG`
  - `NO_TICKETS_IN_GROUP` ("No tickets")
  - `BOARD_NO_TICKETS` ("No tickets yet") replaces `BACKLOG_EMPTY`
  - `SEARCH_TICKETS` ("Search tickets")
  - `FILTER` ("Filter")
  - `FILTER_ASSIGNEE` ("Assignee")
  - `FILTER_STATUS` ("Status")
  - `UNASSIGNED` ("Unassigned")
  - `CLEAR_FILTERS` ("Clear")
  - `SELECTED_COUNT` ("{{count}} selected")
  - `SET_STATUS` ("Set status")
  - `ASSIGN` ("Assign")
  - `UNASSIGN` ("Unassign")
  - `CLEAR_SELECTION` ("Clear selection")
  - `CONFIRM_DELETE_TICKETS` ("Delete {{count}} tickets?")
  - `SELECT_TICKET` ("Select ticket")
  - `SELECT_GROUP` ("Select all in group")
  - `COLLAPSE_GROUP` / `EXPAND_GROUP`
  - `BULK_ACTION_FAILED`
  - `ERRORS.TICKETS.BULK_ACTION_INVALID`
  - keep `BACKLOG` (the status name)
  - remove phrases that become unused

## 2.3 Decisions
1. **Split:** priorities are their own spec (`ticket-priorities.spec.md`). The styled tooltip is its own spec (`tooltips.spec.md`).
2. **Content:** all board tickets, with status Backlog or the column. Only no-column tickets was rejected.
3. **Bulk actions:** set status, assign, unassign and delete. No bulk priority.
4. **Ordering:** grouped by status in board order, drag within a group only. A flat list without dragging and sortable columns were rejected.
5. **Filters:** assignee and status, client-side. Tags come later. No priority filter.
6. **URL:** `/list`, with `/backlog` redirecting.
7. **Bulk API:** new all-or-nothing bulk endpoints in one transaction. Looping the single endpoints was rejected because it means N requests and partial failures.
8. **"Move to board"** stays as a row action for Backlog tickets, next to the bulk status action. (Implementation choice, not one the user asked for. Confirm during review.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Overlaps with other specs:**
- `item-row-click-and-rename.spec.md` (backlog row click area) and `header-and-type-scale.spec.md` (row sizing) change the backlog row this spec renames. If they're merged, carry their changes into `ListRowComponent`. If they're in progress, stop and ask the user.
- `tooltips.spec.md` provides the styled tooltips. This spec only uses `app-icon-button` with tooltips.
- `feature-flags.spec.md` must gate the new bulk endpoints with `:boards`. If it is merged first, add `require_feature!(:boards)` coverage for them here.
- `ticket-priorities.spec.md` builds on this spec and must start after it.

Baseline before starting: run `npm test` in `frontend/` and `bin/rails test` in `backend/`, and note the counts here.

### A. Backend
- [ ] A1. Add `created_at` to `ticket_summary_json`.
- [ ] A2. Add the bulk routes, `bulk_ticket_params`, `BULK_ACTION_INVALID`, `bulk_update` (status, assign, unassign) and `bulk_destroy`, extracting the assignee validation for reuse.
- [ ] A3. Add the tests from 2.2. Run `bin/rubocop` and `bin/brakeman`.

### B. Routing and rename (frontend)
- [ ] B1. Rename `AppRoutes.BACKLOG` to `LIST`, add the redirects, and update `ticketRoute` and every caller and spec.
- [ ] B2. Rename `backlog-tab` → `list-tab` and `backlog-row` → `list-row` (files, classes, selectors, CSS blocks), and the tab label phrase. Tests still pass.

### C. Data layer (frontend)
- [ ] C1. Add `createdAt` to `TicketSummary` and its mapper.
- [ ] C2. Add `bulkUpdate` and `bulkDelete` to `TicketService` with tests.
- [ ] C3. Add `statuses`, `ticketsByStatus`, `applyTickets` and `removeTickets` to `BoardPageStateService`, with tests in `board-page-state.service.spec.ts` (moved tickets land in the right group and position, and removed ones disappear).

### D. List UI (frontend)
- [ ] D1. Build the grouped list with collapse, the per-group counts and empty groups, the drag within a group, and create in Backlog.
- [ ] D2. Extend `ListRowComponent` with the checkbox, status, created date and avatars. Every icon action uses `app-icon-button` with a tooltip phrase.
- [ ] D3. Add the title search and `TicketFilterComponent` (assignee, status, badge, clear).
- [ ] D4. Add selection (row, group select-all), the selection bar and the bulk handlers with the delete confirmation and error toast.
- [ ] D5. Add the phrases to every translation file and remove the unused ones.
- [ ] D6. Add `list-tab.component.spec.ts`:
  - grouping by status
  - search plus filters combine correctly
  - "Unassigned" filter
  - group select-all selects only visible tickets
  - a bulk status success applies the tickets and clears the selection
  - a failure keeps the selection
  - `/backlog` redirects to `/list`

### Z. Wrap-up
- [ ] Z1. Run `bin/rails test`, `bin/rubocop` and `bin/brakeman` in `backend/`, and `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Update `CLAUDE.md`: boards open at `{overview|kanban|list}`, the bulk ticket endpoints, and the renamed components.
- [ ] Z3. Manual check in the running app:
  - Open a board's List: tickets are grouped by Backlog and each column.
  - Search and filter by assignee, Unassigned and status.
  - Select tickets across groups and set status to a column: they appear at the end of that column on Kanban.
  - Assign and unassign several, then delete several.
  - Drag within a group.
  - Create a ticket: it lands in Backlog.
  - An old `/backlog` link and a ticket favorite still open.
