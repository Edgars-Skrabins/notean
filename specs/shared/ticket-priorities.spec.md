# Ticket priorities — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

Tickets can have a priority. Each board has its own configurable list of priorities. Every board starts with five defaults, which can be renamed, recoloured, reordered, deleted and added to.

- **Users:** everyone who can see the board. They can set a ticket's priority and manage the board's priorities.
- **Usage:**
  - **Defaults:** every board (new and existing) starts with, in order:

    | Priority | Colour |
    |---|---|
    | Very low | grey |
    | Low | blue |
    | Medium | yellow |
    | High | orange |
    | Very high | red |

  - **Setting a priority:**
    - The ticket popup gets a **Priority** dropdown listing "No priority" and the board's priorities in order, each with its colour dot.
    - Changing it saves immediately, like the other ticket fields.
    - New tickets have no priority.
  - **Showing a priority:** List tab rows (`board-list-tab.spec.md`) show the priority as a coloured dot and its name, or nothing when there is none.
  - **Managing priorities:** the board's **Overview** tab gets a **Priorities** section listing the board's priorities in order. Each row has:
    - a drag handle to reorder
    - a colour swatch that opens a small palette (grey, blue, teal, green, yellow, orange, red, purple)
    - the name, editable inline (Enter or blur saves, Escape cancels, empty cancels)
    - a delete button

    "Add priority" appends a new one named "New priority" in grey, with its name input focused.
  - **Deleting a priority:**
    - A confirmation states how many tickets use it: "Delete 'High'? 4 tickets will have no priority".
    - Confirming deletes it, and those tickets become "No priority".
    - With 0 tickets the message just asks to confirm.
- **Rules:**
  - A priority belongs to exactly one board. A ticket's priority must belong to the ticket's board.
  - Names are required (at most 40 characters) and unique per board, case-insensitive.
  - Positions are kept contiguous on reorder and delete.
  - Deleting a board deletes its priorities.
  - A board may end up with no priorities. The dropdown then only offers "No priority".
- **Out of scope:**
  - A bulk "Set priority" action in the List selection bar (not chosen).
  - A priority filter.
  - Showing priority on Kanban cards.
  - Sorting by priority.
  - Team-wide priorities.

# Part 2 — Technical details

## 2.1 Tools and libraries
Rails migration and model, existing `insert_and_reindex` (used for ticket and column positions), Angular `app-dropdown`, CDK drag-drop and overlay for the palette. No new dependencies.

## 2.2 Structure

### Backend

**Migration:**
- New table `board_priorities`: `board_id` (FK, not null, index), `name` (string, not null), `color` (string, not null), `position` (integer, not null), timestamps.
- Add `tickets.priority_id` (nullable FK to `board_priorities`, `on_delete: :nullify`, index).
- Backfill the five defaults for every existing board.

**Model `BoardPriority`:**
- `belongs_to :board` and `has_many :tickets, foreign_key: :priority_id, dependent: :nullify`.
- `COLORS = %w[grey blue teal green yellow orange red purple]`.
- `DEFAULTS` holds the five name and colour pairs.
- Validations: `name` presence, length ≤ 40, uniqueness scoped to the board (case-insensitive); `color` inclusion; `position` presence.

**`Board`:**
- `has_many :priorities, -> { order(:position) }, class_name: "BoardPriority", dependent: :destroy`.
- An `after_create` that creates the defaults (where the default columns are created today, check `BoardsController#create` or the model, and follow the same place).

**`Ticket`:**
- `belongs_to :priority, class_name: "BoardPriority", optional: true`.
- Validation that the priority's `board_id` equals the ticket's.

**Routes:** `resources :priorities, only: [ :create, :update, :destroy ]` inside `resources :boards`.

**`PrioritiesController`** (`BoardScoped`, `set_team`, `authorize_team_member!`, `set_board`):
- `create`: `name` and `color`, appended at the end. Responds `{ priority: priority_json }` with 201.
- `update`: `name`, `color` and `position`, reordering with `insert_and_reindex`. Responds `{ priorities: [...] }` for the board, so reorders apply at once.
- `destroy`: nullifies tickets through `dependent: :nullify`, reindexes, and responds `{ priorities: [...] }`.
- `priority_json`: `id`, `name`, `color`, `position` and `ticket_count`.
- Strong params `create_priority_params` and `update_priority_params` go in `ApplicationController`.

**Board and ticket JSON:**
- `board_json` adds `priorities: [...]` (preload them, and use a grouped count for `ticket_count` so the query count stays flat).
- `ticket_json` and `ticket_summary_json` add `priority_id`.
- `TicketsController#update` accepts `priority_id` (null clears it). A priority from another board → `PRIORITY_NOT_FOUND` 404.

**Error codes:** a new module `ErrorCodes::Priorities` with `PRIORITY_NOT_FOUND`, `PRIORITY_NAME_TAKEN` and `PRIORITY_SAVE_FAILED`.

**Tests:**
- model validations
- defaults on board create
- the backfill (a migration test isn't needed; check with a fixture board created through the model)
- controller create, update, reorder and delete (tickets nullified)
- setting and clearing a ticket's priority, and a priority from another board rejected
- the board show query count is equal with 1 and 10 tickets and priorities

### Frontend
- **Models:**
  - `BoardPriority` (`id`, `name`, `color`, `position`, `ticketCount`)
  - `BoardDetail.priorities`
  - `TicketSummary.priorityId` and `TicketDetail.priorityId`
  - `PriorityColor` union
- **`services/priority.service.ts`:** `create`, `update` and `delete`, using `apiRequest` and `teamPath`, with mappers and `priority.service.spec.ts`.
- **`TicketService.update`:** accepts `priorityId`.
- **`BoardPageStateService`:** `setPriorities(priorities)` and `priorityById(id)`.
- **Overview tab (`board-overview-tab`):** a Priorities section using a new `components/priority-list/` (`PriorityListComponent`):
  - drag reorder (CDK)
  - inline rename
  - the palette in a CDK overlay (`components/priority-color-picker/`)
  - delete with `confirm-dialog`, using the count from `ticketCount`
  - "Add priority"
- **Ticket popup (`ticket-detail`):** a Priority field using `app-dropdown` with `prefix` (from `language-flag-alignment-fix.spec.md`) for the colour dot, or a small dot element if `prefix` doesn't fit a coloured dot.
- **List row:** a priority cell with dot and name, looked up via `BoardPageStateService.priorityById`.
- **Colours:** CSS variables `--priority-grey` … `--priority-purple` in `styles.css`. A `.priorityDot` utility class with `[attr.data-color]`, or a style binding to the variable.
- **Phrases** (in `PHRASES` and every translation file):
  - `PRIORITY` ("Priority")
  - `PRIORITIES` ("Priorities")
  - `NO_PRIORITY` ("No priority")
  - `ADD_PRIORITY` ("Add priority")
  - `NEW_PRIORITY` ("New priority")
  - `RENAME_PRIORITY`
  - `CHANGE_PRIORITY_COLOR`
  - `DELETE_PRIORITY`
  - `REORDER_PRIORITY`
  - `CONFIRM_DELETE_PRIORITY` ("Delete '{{name}}'? {{count}} tickets will have no priority")
  - `CONFIRM_DELETE_UNUSED_PRIORITY` ("Delete '{{name}}'?")
  - the default priority names aren't translated (they're data)
  - `ERRORS.PRIORITIES.*` for the three codes

## 2.3 Decisions
1. **Scope:** priorities are per board, seeded on board creation and backfilled. Per team was rejected.
2. **Deleting a used priority:** tickets become "No priority" after a confirmation with the count. Blocking deletion and picking a replacement were rejected.
3. **Who manages:** anyone who can see the board, from the Overview tab.
4. **Default on new tickets:** no priority.
5. **Data:** name, colour and order. Name and order only was rejected.
6. **Colour palette:** the fixed set of eight named colours above. Free hex colours were rejected to keep the theme consistent. (Implementation choice, not one the user asked for. Confirm during review.)
7. **Not translated:** the default names are stored as data in English, since users rename them freely. (Implementation choice, not one the user asked for. Confirm during review.)
8. **Kanban cards** don't show priority in this spec. (Not requested. Confirm during review.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Prerequisite:** `board-list-tab.spec.md` is merged (the List rows show the priority). If it isn't, stop and ask the user.

**Overlaps with other specs:**
- `feature-flags.spec.md` must gate `PrioritiesController` with `:boards`. If it's merged, add `require_feature!(:boards)` and a test here.
- `language-flag-alignment-fix.spec.md` provides the dropdown `prefix`.
- `detail-close-button-placement`, `escape-shortcut` and `radius-and-spacing` touch `ticket-detail`.

If any of these is in progress on another branch, stop and ask the user before editing the shared files.

Baseline before starting: run `npm test` in `frontend/` and `bin/rails test` in `backend/`, and note the counts here.

### A. Data model (backend)
- [ ] A1. Add the migration (table, ticket FK, backfill) and run `bin/rails db:migrate`.
- [ ] A2. Add the `BoardPriority` model, the `Board` and `Ticket` associations and validations, and the defaults on board create. Add model tests and fixtures in `test/fixtures/board_priorities.yml`.

### B. API (backend)
- [ ] B1. Add `ErrorCodes::Priorities`, the routes, strong params and `PrioritiesController`, with tests.
- [ ] B2. Add priorities to `board_json` and `priority_id` to the ticket JSON, and accept `priority_id` in ticket update, with tests including the query count.
- [ ] B3. Run `bin/rubocop` and `bin/brakeman`.

### C. Data layer (frontend)
- [ ] C1. Add the models, mappers, error codes and translations.
- [ ] C2. Add `PriorityService` with tests, `priorityId` in `TicketService.update`, and the `BoardPageStateService` helpers with tests.

### D. UI (frontend)
- [ ] D1. Add the priority colour variables and the dot style.
- [ ] D2. Add `PriorityListComponent` and the colour picker on the Overview tab (reorder, rename, recolour, add, delete with count). Add a spec covering rename commit and cancel, delete message with and without tickets, and reorder calling `update` with the new position.
- [ ] D3. Add the Priority dropdown to the ticket popup, with a test that changing it calls `update` and that "No priority" sends null.
- [ ] D4. Add the priority cell to the List row.
- [ ] D5. Add the phrases to every translation file.

### Z. Wrap-up
- [ ] Z1. Run `bin/rails test`, `bin/rubocop` and `bin/brakeman` in `backend/`, and `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Update `CLAUDE.md`: board priorities and the ticket `priority_id`.
- [ ] Z3. Manual check in the running app:
  - An existing board has the five defaults, and a new board too.
  - Set a ticket's priority in its popup: the List row shows the dot and name.
  - Rename, recolour, reorder, add and delete a priority used by tickets: the count is right, and the tickets now show no priority.
  - A second board's priorities are independent.
