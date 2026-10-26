# Ticket position shifts — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Moving, bulk-moving and deleting tickets currently renumbers ticket positions one row at a time. Dragging a ticket to the top of a column with 300 tickets runs about 300 `UPDATE` queries, and every renumbered ticket (with its assignees) is broadcast to everyone viewing the board. This change makes every position change a few set-based `UPDATE`s and replaces the per-ticket broadcast of renumbered siblings with a small "shift" message that clients apply to the tickets they have loaded.

It also makes positions always dense. Today a single move leaves a gap in the source column and a single delete leaves a gap in its group, while the Kanban and the List tab's drag treat a ticket's position as its index in the group.

- **Users:** every team member working on a board (Kanban tab, List tab, ticket popup), and everyone else watching the same board live.
- **Usage:** nothing visible changes. Dragging tickets in the Kanban or List tab, moving a ticket from the ticket popup, bulk moving and bulk deleting from the List tab's selection bar, and deleting a single ticket all look and behave as today. Other viewers still see the change live, in the same order.
- **Rules:**
  - In every status group of a board (the backlog, or one column), ticket positions are always `0, 1, 2, … n-1`: no gaps, no duplicates.
  - A move to index `i` places the ticket at position `i` in its target group (clamped to the group's size). Tickets after it in the target group move down by one. If it left another group, the tickets after its old position there move up by one.
  - A single delete closes its gap. A bulk delete closes all gaps in every group it touched.
  - A bulk move appends the tickets to the end of the target group in the requested order (as today) and closes the gaps in their source groups.
  - Shifting a ticket's position never changes its `updated_at` or `lock_version` (as today with `update_column`). The moved ticket itself is saved normally.
  - Creating a ticket appends it at the end of its group (unchanged).
- **Out of scope:**
  - Favorites and board priorities also use `insert_and_reindex`, but their lists are short. They stay as they are.
  - Concurrent moves in the same group at the same instant can still race, as they can today. No locking is added.
  - Columns are deleted together with their tickets. Unchanged.

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. Plain ActiveRecord `update_all` and SQL (a `ROW_NUMBER()` window and `array_position`) on PostgreSQL.

## 2.2 Structure

### Backend

**New `app/models/ticket_positions.rb`** (a plain Ruby class, like `FolderProject` and `MembershipRemoval`). Every method works on one status group, identified by `board` and `column_id` (`nil` = backlog). Each one runs a single `update_all` or SQL statement, with no `updated_at` change, and returns the shift entries it applied (see the message format below):

- `TicketPositions.shift(board, column_id, from:, to: nil, delta:)` → `UPDATE tickets SET position = position + delta WHERE board_id = ? AND column_id IS/= ? AND position >= from [AND position <= to]`. It returns `[{ column_id:, from_position: from, to_position: to, delta: }]`, or `[]` when the range is empty (`to` < `from`).
- `TicketPositions.close_gaps(board, column_id, removed_positions)` renumbers the group to `0..n-1` with one `UPDATE … FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) - 1 AS new_position …) WHERE tickets.position <> new_position`. Run it after the tickets have left the group. It returns the shift ranges derived from the sorted removed positions `p1 < p2 < … < pk`: `{ from_position: pj + 1, to_position: p(j+1) - 1, delta: -j }` for each `j`, with `to_position: nil` for the last one. Ranges that are empty are dropped.
- `TicketPositions.append(board, column_id, ticket_ids)` → one `UPDATE tickets SET column_id = ?, position = start + array_position(ARRAY[ids], id) - 1, updated_at = now WHERE id IN (ids)`, where `start` is the target group's size without those tickets. This one does set `updated_at`, matching today's bulk move.

**`TicketsController`** (`app/controllers/tickets_controller.rb`):

- `update` with a move (column change, `to_backlog`, or `position`) runs in `Ticket.transaction`:
  - Same group, old position `o`, target index `i` (clamped to `0..size-1`): `i > o` → `shift(from: o + 1, to: i, delta: -1)`; `i < o` → `shift(from: i, to: o - 1, delta: +1)`.
  - Other group: `shift(source, from: o + 1, delta: -1)`, then `shift(target, from: i, delta: +1)` with `i` clamped to `0..target size`.
  - Then set the ticket's `column` and `position = i` and save it as today (lock version and validation unchanged).
- `destroy`: destroy the ticket, then `shift(group, from: o + 1, delta: -1)`, in one transaction.
- `bulk_update` with `column_id` / `to_backlog`: `TicketPositions.append` for the moved tickets, then `close_gaps` for each source group with the positions the moved tickets had there If the target group was also a source, close its gaps the same way. The appended tickets stay at the end because `close_gaps` keeps the order, and their final positions reach clients through the `tickets_upserted` that follows.
- `bulk_destroy`: destroy the tickets as today, then `close_gaps` per group.
- Remove `move_ticket`, `move_tickets`, `reindex_group`, `reindexed_tickets` and `reindexed_tickets_json`. `insert_and_reindex` stays in `ApplicationController` for favorites and priorities.

**Broadcasts** (`app/models/board_broadcast.rb`): add `BoardBroadcast.tickets_shifted(board, shifts)` → `{ type: "tickets_shifted", shifts: [...] }`. Each shift is `{ column_id, from_position, to_position, delta }`, where `to_position` `nil` means "to the end of the group". All shifts in one message refer to positions **before** the change and are applied together: each loaded ticket is matched against its old position once. Controllers broadcast after their render, on separate lines as today:

- move: `tickets_shifted` (only if any shifts), then `tickets_upserted` with only the moved ticket (`ticket_broadcast_json`).
- single delete: `tickets_shifted`, then `tickets_removed`.
- bulk move: `tickets_shifted` for the source groups, then `tickets_upserted` with the moved tickets (`bulk_tickets_json`).
- bulk delete: `tickets_shifted`, then `tickets_removed`.
- Assign or unassign in bulk: unchanged (no position changes, so no shift message).

### Frontend

- `models/ticket.model.ts`: add `TicketShift { columnId: number | null; fromPosition: number; toPosition: number | null; delta: number }`.
- `services/board-channel.service.ts`: add `{ type: 'tickets_shifted'; shifts: RawTicketShift[] }` to the message union, map it to `TicketShift` and call `state.applyShifts(shifts)`.
- `pages/dashboard/board-page/board-page-state.service.ts`: add `applyShifts(shifts)`. For each group it computes every loaded ticket's new position from its old one (a ticket matches at most one shift per group), re-sorts the group by position, and emits the shifts on a new `ticketShifts$` Subject.
- `pages/dashboard/list-tab/list-tab.component.ts`: subscribe to `state.ticketShifts$` and apply the same position arithmetic to each group's loaded tickets (including `extraIds` tickets), then re-sort. Put the arithmetic in one pure helper, `utils/ticketShifts.ts` (`shiftedPosition(position, columnId, shifts)`), used by both the state service and the List tab.
- The mover's own client receives the broadcasts like everyone else (as today) and applies them. Its local drag already reordered the array, and the shift plus upsert set the final position numbers.

## 2.3 Decisions

1. **Single set-based UPDATE instead of per-row reindex.** Chosen 2026-10-26. Rejected: gapped or fractional positions. They would change the API's index semantics and the frontend's index-based drag.
2. **Broadcast a shift message instead of the renumbered tickets.** Chosen 2026-10-26, so the websocket payload doesn't grow with column size. Rejected: keep broadcasting every shifted ticket (backend-only, but large payloads). The shifts go out as a separate `tickets_shifted` message before the `tickets_upserted` / `tickets_removed` message (the option offered as "new `tickets_shifted` message").
3. **Bulk move and bulk delete are included.** Chosen 2026-10-26, so no ticket path keeps per-row position updates.
4. **Positions stay dense.** Chosen 2026-10-26: single moves now also close the source gap, and single deletes close theirs. Rejected: allowing gaps, since the List tab sends a ticket's position as the target index and that breaks once gaps exist.
5. **Shift entries are ranges with a nullable `to_position`.** One format covers moves (one or two ranges) and gap closing after bulk actions (one range per removed position). All ranges use pre-change positions.
6. **Favorites and priorities keep `insert_and_reindex`.** Their lists are short, so they are out of scope.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` in `backend/` and `npm test` in `frontend/` and note the counts here.

### A. Backend position helpers
- [ ] A1. Create `backend/app/models/ticket_positions.rb` with `shift`, `close_gaps` and `append` as described in 2.2. Each runs one statement and returns its shift entries.
- [ ] A2. Add `backend/test/models/ticket_positions_test.rb`. Cover: shift up and down within a range and open-ended; backlog (`column_id` nil) vs column; that other groups and other boards are untouched; that `updated_at` and `lock_version` don't change on `shift` and `close_gaps`; `close_gaps` renumbering and the returned ranges for removed positions like `[0]`, `[3, 7, 10]` and adjacent `[2, 3]`; `append` ordering by the given ids.

### B. Backend controller and broadcasts
- [ ] B1. Add `BoardBroadcast.tickets_shifted` in `backend/app/models/board_broadcast.rb`.
- [ ] B2. Rewrite the move path of `TicketsController#update` using `TicketPositions.shift` inside a transaction, covering same-group up and down, cross-group, `to_backlog` and clamping. Broadcast `tickets_shifted` and then `tickets_upserted` with only the moved ticket.
- [ ] B3. `TicketsController#destroy`: close the gap and broadcast `tickets_shifted` before `tickets_removed`.
- [ ] B4. `bulk_update` (column / backlog) and `bulk_destroy`: use `append` and `close_gaps`, and broadcast as in 2.2. Remove `move_ticket`, `move_tickets`, `reindex_group`, `reindexed_tickets` and `reindexed_tickets_json`.
- [ ] B5. Update `backend/test/controllers/tickets_controller_test.rb`. Rewrite the broadcast tests that expect reindexed siblings ("a move broadcasts the moved ticket and only the siblings whose position changed", "bulk update broadcasts the moved tickets and the reindexed source tickets") to expect `tickets_shifted` plus the moved tickets. Add tests that positions stay dense after: a cross-column move (source closed), a single delete, a bulk move from two groups, and a bulk delete. Add a query-count test: moving a ticket to the top of a column with 1 and with 10 siblings runs the same number of queries.
- [ ] B6. Update `CLAUDE.md`'s `BoardChannel` bullet: add `tickets_shifted` and say reindexed siblings are no longer in `tickets_upserted`.

### C. Frontend
- [ ] C1. Add `TicketShift` to `frontend/src/app/models/ticket.model.ts` and the pure helper `frontend/src/app/utils/ticketShifts.ts` with a spec covering ranges, open ends, multiple ranges and other groups.
- [ ] C2. `BoardChannelService`: handle `tickets_shifted` → `state.applyShifts`. `BoardPageStateService.applyShifts` updates and re-sorts the groups and emits `ticketShifts$`. Update `board-channel.service.spec.ts` with a shift message test.
- [ ] C3. `ListTabComponent`: follow `ticketShifts$` and shift the loaded tickets in each group. Add a spec test where a shift followed by an upsert leaves the group in the right order.
- [ ] C4. Update `CLAUDE.md`'s "Boards update live" bullet to mention `tickets_shifted` / `applyShifts`.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`bin/rails test`, `bin/rubocop`, `npm test`, `npm run build`).
- [ ] Z2. Manual check in the running app with two browser windows on one board: drag within a column up and down, across columns, to and from the backlog in the List tab, a single delete, and a bulk move and bulk delete. Both windows show the same order, and after a reload the order is unchanged.
