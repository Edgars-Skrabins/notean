# Ticket summaries without description — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Ticket lists load full ticket rows, including `description` (up to 10,000 characters of HTML), but the summary JSON they render never includes it. The board load (every ticket of every column and the backlog), the List tab's per-group pages, My Work and the bulk-action responses all read descriptions only to throw them away. This change skips the column in those queries, the same way pages and diagrams skip `content` in their lists (`Page.without_content`). No response changes.

- **Users:** everyone opening a board, using the List tab, the home page's My Work, or bulk actions.
- **Usage:** unchanged. Same responses, less data read from the database.
- **Rules:**
  - Endpoints that render a description keep loading it: ticket show, create and update (`ticket_json`), the conflict response, and broadcasts of tickets changed by create, update or an assignee action (`ticket_broadcast_json`).
  - Global search keeps loading it (the ticket snippet comes from the description).
- **Out of scope:** paginating the board load or dropping the backlog from it. Separate work.

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies.

## 2.2 Structure

- `app/models/ticket.rb`: add `scope :without_description, -> { select(column_names - %w[description]) }`, mirroring `Page.without_content`.
- `app/controllers/boards_controller.rb`:
  - Today `set_board` preloads `columns: { tickets: … }` and `backlog_tickets` for show and update, and those association preloads can't take a `select`.
  - Instead, `board_json` loads the board's tickets once: `board.tickets.without_description.includes(TicketJson::ASSIGNEES_PRELOAD).order(:position)`, grouped by `column_id`. Columns take their group and the backlog takes the `nil` group.
  - `set_board` keeps preloading `creator`, `columns` (without tickets) and `priorities`.
  - The query count for show must still not grow with the number of tickets.
- `app/controllers/tickets_controller.rb`: `index` and `bulk_tickets_json` use `without_description`.
- `app/controllers/my_work_controller.rb`: the tickets query uses `without_description`.
- Watch for code that reads `description` from a ticket loaded this way. It would raise `ActiveModel::MissingAttributeError`. The controller tests catch this.

## 2.3 Decisions

1. **A `without_description` select scope, the same as `Page.without_content`.** Chosen 2026-10-26.
2. **The board load builds column tickets from one query grouped by `column_id`** instead of association preloads, because preloads can't apply a `select`. This is an implementation detail, not a behaviour change.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` in `backend/` and note the count here.

### A. Backend
- [ ] A1. Add `Ticket.without_description` in `backend/app/models/ticket.rb`, with a model test that a loaded record has no `description` attribute and still renders `ticket_summary_json` fields.
- [ ] A2. `BoardsController`: build `board_json`'s column and backlog tickets from one `without_description` query, and drop the ticket preloads from `set_board`. The existing board show and update tests and their query-count tests must pass unchanged.
- [ ] A3. `TicketsController#index` and `bulk_tickets_json`: use `without_description`. Existing tests must pass, including the index query-count test.
- [ ] A4. `MyWorkController#index`: use `without_description`. Existing tests must pass.
- [ ] A5. Add one assertion per endpoint changed in A2–A4 that the SQL doesn't select `tickets.description`, using `ActiveSupport::Notifications` around the request, or the existing `query_count` helper's pattern if it captures SQL.

### Z. Wrap-up
- [ ] Z1. Full backend test run, `bin/rubocop`.
- [ ] Z2. Manual check in the running app: open a board (Kanban and List tabs), the home page's My Work, and do a bulk move. Everything renders as before, and the ticket popup still shows the description.
- [ ] Z3. Update `CLAUDE.md`'s model or controller notes to mention `Ticket.without_description` next to the list-query convention.
