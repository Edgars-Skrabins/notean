# Board query fix — Spec

**Type:** bug fix
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Two board endpoints do more database work than they need to. Neither changes what users see.

1. **Overview counts.** The board Overview tab (`GET /teams/:team_code/boards/:id/overview`, `BoardsController#overview`) runs six separate count queries over the board's tickets:
   - the per-column group count;
   - total;
   - backlog;
   - created in the last 7 days;
   - updated in the last 7 days;
   - unassigned (in `assignee_counts_json`).

   One grouped query can return all of them.
2. **Unassigned filter.** The List tab's "none" (unassigned) filter in `GET /teams/:team_code/boards/:board_id/tickets` (`TicketsController#assignee_filtered`) checks `tickets.where.not(id: TicketAssignee.select(:ticket_id))`. That subquery has no scope, so its `NOT IN` covers every ticket assignment of every team in the database, and gets slower as the whole app grows.

Reproduce:
- **Overview:** watch the SQL log while opening a board's Overview tab. There are six `COUNT` queries on `tickets`, plus one `COUNT` grouped by `user_id` on `ticket_assignees`.
- **List tab:** filter by "Unassigned". The query contains `NOT IN (SELECT "ticket_assignees"."ticket_id" FROM "ticket_assignees")` with no `WHERE`.

Expected:
- **Overview:** one count query over the board's tickets, plus the existing per-assignee count.
- **List tab:** the unassigned check only looks at each ticket's own assignments.

- **Users:** anyone opening a board's Overview tab or filtering the List tab by "Unassigned".
- **Usage:** unchanged. Same responses, same numbers, same order.
- **Rules:**
  - Every overview field keeps its current meaning:
    - `total_tickets`: all of the board's tickets.
    - `board_tickets`: tickets in a column.
    - `backlog_tickets`: tickets with `column_id` null.
    - Per-column `ticket_count`, including 0 for empty columns.
    - `created_last_7_days` and `updated_last_7_days`, counted from `RECENT_ACTIVITY_PERIOD.ago`.
    - The unassigned row in `assignees`: tickets with no assignee.
  - The "none" filter keeps returning tickets with no assignee, alone or combined with member ids (`assignee_ids: ["none", <id>]`).
- **Out of scope:**
  - The overview's other queries: columns, recent tickets with their columns, the per-assignee count, users and avatars. Each does a distinct job and already has a fixed query count.
  - The member part of the assignee filter (`TicketAssignee.where(user_id: member_ids)`). It is already limited by user id.

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. PostgreSQL's aggregate `FILTER (WHERE …)` clause and a correlated `NOT EXISTS`.

## 2.2 Structure

`backend/app/controllers/boards_controller.rb`:
- `overview` replaces its count queries with one grouped query over `@board.tickets`. It groups by `column_id` and plucks these values for each group:
  - `column_id`;
  - `COUNT(*)`;
  - `COUNT(*) FILTER (WHERE tickets.created_at >= :since)`;
  - `COUNT(*) FILTER (WHERE tickets.updated_at >= :since)`;
  - `COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM ticket_assignees WHERE ticket_assignees.ticket_id = tickets.id))`.
- Bind `since` through `Ticket.sanitize_sql_array`, never by string interpolation, and pass the expressions to `pluck` wrapped in `Arel.sql`.
- From those rows:
  - `total_tickets` is the sum of all groups.
  - `backlog_tickets` is the `nil` group, or 0 when there is none.
  - `board_tickets` is total minus backlog.
  - Each column's `ticket_count` is its group, or 0 when there is none.
  - `created_last_7_days`, `updated_last_7_days` and the unassigned count are sums over all groups.
- A private helper builds the totals from the rows, so `overview` stays readable. Naming follows the controller's style (e.g. `ticket_counts(tickets)` returning a hash).
- `assignee_counts_json` takes the unassigned count as an argument instead of running `tickets.where.missing(:ticket_assignees).count`.
- The response JSON is unchanged.

`backend/app/controllers/tickets_controller.rb`:
- In `assignee_filtered`, the "none" branch becomes a correlated `NOT EXISTS`: `tickets.where(TicketAssignee.where("ticket_assignees.ticket_id = tickets.id").arel.exists.not)`.
- It stays a plain `where` on `tickets`, so it can still be combined with the member filter through `.or`.

Tests:
- `backend/test/controllers/boards_controller_test.rb` gets a test that pins the count queries.
- The existing overview and "none" filter tests stay as they are and must keep passing.

## 2.3 Decisions

1. **One spec or two?** One spec for both. They are small board query fixes that land in one branch and pull request.
2. **How far to fold the overview counts?** Into one query grouped by `column_id` with `FILTER` clauses, which replaces 6 count queries with 1. Rejected: keeping the per-column group count next to a separate `FILTER` aggregate. That is 2 queries for no real gain in simplicity.
3. **Scope of the overview change?** The counts only, including the unassigned count. Rejected: also folding the per-assignee count, users and avatars. That means more SQL and more risk for a small gain.
4. **How should the "none" filter find unassigned tickets?** With a correlated `NOT EXISTS`, which Postgres plans as an anti-join on the `(ticket_id, user_id)` index and which stays compatible with `.or`. Rejected: keeping `NOT IN` with a subquery scoped to the board's tickets. That is a smaller diff, but still a weaker plan than an anti-join.
5. **Spec name and type:** `board-query-fix`, a bug fix, so the branch is `fix/board-query-fix`.
6. **How do tests pin the change?** A test asserts that the overview runs exactly 2 SQL statements containing `COUNT`: the folded aggregate and the per-assignee count. This pins the fix without depending on the auth and preload queries. Rejected: relying only on the existing behaviour tests, which wouldn't stop the counts from being split up again.
7. **Overlap with other specs:** `ticket-summary-without-description.spec.md` also changes `boards_controller.rb` (`set_board` and `board_json`, not `overview`). Whichever lands second rebases onto the other.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` in `backend/` and note the count here.

### A. Overview counts
- [ ] A1. Add a test to `backend/test/controllers/boards_controller_test.rb`.
  - Build a board with tickets in a column and in the backlog, and at least one assignee.
  - Collect the SQL of `GET …/overview` through `ActiveSupport::Notifications` on `sql.active_record`, skipping `SCHEMA` queries.
  - Assert that exactly 2 statements match `/COUNT\(/i`.
  - Run it and confirm it fails on the current code with 7.
- [ ] A2. In `backend/app/controllers/boards_controller.rb`, replace the counts in `overview` with the grouped query from 2.2, through a private helper.
  - Derive `total_tickets`, `board_tickets`, `backlog_tickets`, per-column `ticket_count`, `created_last_7_days` and `updated_last_7_days` from its rows.
  - Remove the now-unused `tickets.count`, `where(column_id: nil).count`, `where.not(column_id: nil).group(:column_id).count` and the two date-range counts.
- [ ] A3. Change `assignee_counts_json` to take the unassigned count from A2 instead of `tickets.where.missing(:ticket_assignees).count`.
- [ ] A4. Run `bin/rails test test/controllers/boards_controller_test.rb`. The new test and all existing overview tests pass with unchanged numbers:
  - "counts tickets per column including empty columns";
  - "counts recent activity";
  - "counts tickets per assignee … plus unassigned";
  - "show and overview run the same number of queries for 1 and 10 tickets".

### B. Unassigned filter
- [ ] B1. In `backend/app/controllers/tickets_controller.rb`, change the "none" branch of `assignee_filtered` to the correlated `NOT EXISTS` from 2.2, keeping the `.or` with the member filter.
- [ ] B2. Run `bin/rails test test/controllers/tickets_controller_test.rb`. The existing "none" filter tests pass unchanged: `assignee_ids: ["none"]` alone and combined with a member id.

### Z. Wrap-up
- [ ] Z1. Full test run, lint and security scan in `backend/`: `bin/rails test`, `bin/rubocop`, `bin/brakeman`. No frontend changes.
- [ ] Z2. Manual check in the running app:
  - Open a board with tickets in columns and the backlog, some assigned and some not, and check that every number on the Overview tab matches the tickets.
  - In the List tab, filter by "Unassigned" alone and together with a member, and check the right tickets show.
