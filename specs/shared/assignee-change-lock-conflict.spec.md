# Assignee change lock conflict — Spec

**Type:** bug fix
**Status:** ready for implementation
**Last updated:** 2026-10-27

# Part 1 — Business logic and usage

Changing a ticket's assignees can fail with "Could not update assignees" when it overlaps with a title or description save of the same ticket. Assignee changes are meant never to conflict, but today they check and bump the ticket's `lock_version`, the optimistic lock that guards the ticket's title and description text.

**How to reproduce (ticket popup):**

1. Open a ticket, click into the description textarea and type something.
2. While the textarea is still focused, click "Assign to me".
3. The click blurs the textarea, so the description save (`PATCH …/tickets/:id`, which bumps `lock_version`) and `POST …/tickets/:id/assignees` go out together.
4. If the description save commits first, the assignee request touches its in-memory ticket with the old `lock_version` and Rails raises `ActiveRecord::StaleObjectError` ("Attempted to touch a stale object: Ticket."). The request rolls back, returns 409, and the popup shows the "Could not update assignees" toast. The assignee is not added.
5. If the assign commits first, it bumps `lock_version`. The description save then sends the old version, gets 409 `EDIT_CONFLICT`, and the user sees the edit-conflict dialog over their own assign.

The same happens with removing an assignee. Bulk assign and unassign in the List tab never fail, but they bump `lock_version` too. So a bulk assign can give someone who is editing one of those tickets' title or description an edit conflict.

**Expected behaviour:** an assignee change never fails because of a title or description save, and never makes a title or description save conflict. The ticket's `updated_at` still moves forward on every assignee change.

- **Users:** board members who assign or unassign people in the ticket popup or with the List tab's bulk actions, including while they or someone else edits the same ticket's text.
- **Usage:** nothing changes in the UI. Both of the popup's concurrent requests succeed, and each response updates the popup and the shared board as today. The bulk actions behave as today.
- **Rules:**
  - `lock_version` changes only through saves of the ticket record itself (title, description, column move, priority and so on), never through an assignee change.
  - Every way an assignee is added or removed refreshes the ticket's `updated_at` without changing `lock_version`: the single assign/unassign endpoints, bulk assign/unassign, `MembershipRemoval` and `ProjectAccessCleanup`.
  - Deleting a ticket, which destroys its assignees, does not issue a refresh for each assignee.
- **Out of scope:**
  - Frontend changes. With the backend fixed, the popup's concurrent requests both succeed, so no request queuing is needed.
  - Other unchecked `lock_version` bumps (column moves, project changes and so on). Those are ticket saves and keep their current behaviour.

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. Rails 8.1 ActiveRecord behaviour that matters here:

- `touch` (including `belongs_to …, touch: true`) on a model with optimistic locking adds `lock_version` to the `WHERE` clause and increments it. A stale in-memory record raises `StaleObjectError`.
- `relation.touch_all` and `relation.update_all(hash)` add `lock_version = lock_version + 1` automatically when the hash has no `lock_version` key. They never check it.
- `relation.update_all([ "sql = ?", value ])` (array/string form) does not touch `lock_version`. `TicketPositions` already uses this form for the same reason.

## 2.2 Structure

**Root cause:** `backend/app/models/ticket_assignee.rb` declares `belongs_to :ticket, touch: true`. In `TicketAssigneesController#create`, `@ticket.ticket_assignees.find_or_initialize_by(user:)` sets the assignee's `ticket` to the controller's `@ticket` instance (inverse association). `assignee.save!` then touches that instance with the `lock_version` it was loaded with. `#destroy` hits the same touch through `assignee.destroy`. The bulk paths in `TicketsController` (`assign_tickets`, `unassign_tickets`) call `touch_all`, which bumps without checking.

**Changed files:**

- `backend/app/models/ticket.rb`: new class method `Ticket.refresh_updated_at(ticket_ids)`, which runs `where(id: ticket_ids).update_all([ "updated_at = ?", Time.current ])`. It sets `updated_at` and leaves `lock_version` alone.
- `backend/app/models/ticket_assignee.rb`: `belongs_to :ticket` without `touch: true`. Add `after_create` and `after_destroy` callbacks (one private method) that call `Ticket.refresh_updated_at(ticket_id)`, skipping the destroy case when `destroyed_by_association` is set (the ticket itself is being deleted). They run inside the save's transaction, so a rolled-back assign also rolls back the refresh.
- `backend/app/controllers/tickets_controller.rb`: `assign_tickets` and `unassign_tickets` call `Ticket.refresh_updated_at(tickets.map(&:id))` instead of `@board.tickets.where(id: …).touch_all`. `insert_all` and `delete_all` skip callbacks, so the bulk paths still refresh explicitly.
- `backend/app/controllers/ticket_assignees_controller.rb`: no change needed. `@ticket.reload` before rendering already picks up the new `updated_at`.
- `CLAUDE.md`, Backend → Models, optimistic-locking bullet: say that assignee changes don't bump `lock_version` (they only refresh `updated_at`), and that `update_all` leaves it alone only in its array/string form, while the hash form and `touch_all` bump it.

**Tests:**

- `backend/test/models/ticket_assignee_test.rb`: creating and destroying an assignee through a ticket instance whose `lock_version` is stale (another instance saved the ticket in between) doesn't raise, advances the ticket's `updated_at` and leaves `lock_version` unchanged.
- `backend/test/controllers/ticket_assignees_controller_test.rb`: create and destroy leave `lock_version` unchanged and return a newer `updated_at`. After an assign, a description `PATCH` with the version from before the assign succeeds (the reverse-order race).
- `backend/test/controllers/tickets_controller_test.rb`: bulk assign and bulk unassign leave `lock_version` unchanged and advance `updated_at`.

The race itself can't happen across sequential integration-test requests, because each request loads the ticket fresh. The model test reproduces it with a stale instance. Check that the model test fails before the model change.

## 2.3 Decisions

1. **Should an assignee change bump `lock_version`?** No. Assignee changes only refresh `updated_at`. `lock_version` exists to guard the title and description text, and assignees don't touch that text. This fixes both orderings of the race. Rejected: bumping without a check (as `touch_all` does), which keeps the reverse-order `EDIT_CONFLICT` on the description save; reloading or row-locking the ticket before touching, which only shrinks the window and also keeps the reverse-order conflict.
2. **Where does the `updated_at` refresh for single assign/unassign live?** In `TicketAssignee` `after_create`/`after_destroy` callbacks that replace `touch: true`. This covers every path that creates or destroys a `TicketAssignee` (`MembershipRemoval`, `ProjectAccessCleanup`, future ones). Rejected: refreshing in `TicketAssigneesController`, which other paths would have to remember.
3. **Do the bulk paths change too?** Yes. They stop bumping `lock_version`, so single and bulk follow the same rule.
4. **Does the frontend change?** No. With the backend fixed, the popup's concurrent requests both succeed. Rejected: queuing assignee requests behind a pending text save, which would be redundant.
5. **Name of the shared helper:** `Ticket.refresh_updated_at(ticket_ids)`. Chosen while writing the spec; adjust it at review if needed.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` in `backend/` and record the run, assertion and failure counts here.

### A. Model

- [ ] A1. In `backend/test/models/ticket_assignee_test.rb`, add the stale-instance tests from 2.2 (create and destroy). Run them and confirm they fail with `StaleObjectError` on the current code.
- [ ] A2. Add `Ticket.refresh_updated_at(ticket_ids)` to `backend/app/models/ticket.rb` (array-form `update_all`, see 2.1).
- [ ] A3. In `backend/app/models/ticket_assignee.rb`, drop `touch: true` and add the `after_create`/`after_destroy` callback that calls `Ticket.refresh_updated_at(ticket_id)`, skipping when `destroyed_by_association` is set. The A1 tests pass. Run `bin/rails test test/models`.

### B. Controllers

- [ ] B1. In `backend/app/controllers/tickets_controller.rb`, replace the `touch_all` calls in `assign_tickets` and `unassign_tickets` with `Ticket.refresh_updated_at(tickets.map(&:id))`.
- [ ] B2. Add the controller tests from 2.2 to `ticket_assignees_controller_test.rb` (create/destroy keep `lock_version` and advance `updated_at`; a description save with the pre-assign version succeeds) and to `tickets_controller_test.rb` (bulk assign/unassign keep `lock_version` and advance `updated_at`). Run both files.

### C. Docs

- [ ] C1. Update the optimistic-locking bullet in the root `CLAUDE.md` as described in 2.2.

### Z. Wrap-up

- [ ] Z1. In `backend/`: `bin/rails test`, `bin/rubocop`, `bin/brakeman`.
- [ ] Z2. Manual check in the running app: open a ticket, type in the description, click "Assign to me" while the textarea is focused. Both the description and the assignee are saved, with no toast and no conflict dialog. Repeat with removing an assignee, then bulk-assign the ticket from the List tab while it is open in another browser with an unsaved description, and save that description without a conflict.
