# Ticket status control — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

A ticket's status is where it lives on its board: the Backlog or one of the board's columns. The ticket popup (opened from the Kanban or List tab, `…/tickets/:ticketId`) shows Priority, Tags and Assignees in its sidebar but not the status. The only way to change it is a header button that depends on where the ticket is: "Move to backlog" for a column ticket, or "Move to board", which opens a separate dialog to pick a column, for a backlog ticket. A column ticket can't be moved to another column from the popup at all. The UX critique of 2026-11-04 rated "visibility of system status" 2/4 and listed this as P1: "Ticket popup has no Status/Column control."

This feature adds a Status field at the top of the popup sidebar that shows the ticket's current status and changes it in one step.

- **Users:** every team member who can open the ticket (team members who can see the board's project, while boards are on).
- **Usage:**
  1. The popup sidebar starts with a **Status** field (same small heading style as Priority), followed by Priority, Tags and Assignees as today.
  2. The field is a dropdown showing the current status: "Backlog" or the column's title. Opening it lists Backlog first, then the board's columns in board order, with the current one marked as selected (the dropdown's existing behaviour).
  3. Picking another status moves the ticket to the bottom of that column or of the Backlog. The dropdown shows the new status once the server confirms; the Kanban and List tabs behind the popup update at the same time.
  4. Picking the current status does nothing.
  5. If the move fails, a "Could not move the ticket" toast appears (the existing `TICKET_MOVE_FAILED` message) and the dropdown keeps showing the old status.
  6. When another person moves the ticket while the popup is open, the dropdown follows the live update (the popup already refreshes `columnId` from `remoteChanges$`).
  7. The header's "Move to backlog" and "Move to board" buttons are removed, and so is the popup's Move to board dialog; the Status field replaces both. The header keeps the favourite star, Delete, Copy link and Close.
- **Rules:**
  - The server decides the position: a status change without a position appends the ticket to the bottom of the target (existing `TicketsController#update` behaviour). The ticket's `lock_version` is bumped by the move but no version is sent, so a move never conflicts (existing rule in `CLAUDE.md`).
  - A move notifies the ticket's owners about the "status" change and broadcasts `tickets_shifted` then `tickets_upserted` on the board channel; all of this already happens in `TicketsController#update`.
  - A column must belong to the ticket's board, otherwise 404 `COLUMN_NOT_FOUND` (existing).
- **Out of scope:**
  - Choosing a position inside the target column (drag and drop on the Kanban and List tabs covers that).
  - The Kanban card's "Move to backlog" action and the List row's "Move to board" action, which stay (see `kanban-card-readability.spec.md` for the card).
  - The bulk "Set status" menu in the List tab's selection bar (unchanged).
  - Dialog focus and semantics of the popup shell (`dialog-accessibility.spec.md`).

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. Reuses `DropdownComponent` (`app-dropdown`), `TicketService.moveTicket` / `moveToBacklog`, `BoardPageStateService.statuses` and `placeTicket`, and `ToastService`.

## 2.2 Structure

### Backend: no change needed

Checked on master f15abdf:

- `PATCH /teams/:team_code/boards/:board_id/tickets/:id` (`backend/app/controllers/tickets_controller.rb#update`) already accepts `ticket[column_id]` (a column of the board, else 404 `COLUMN_NOT_FOUND`) and `ticket[to_backlog]`, with an optional `position`. Without a position `shift_for_move` appends to the bottom of the target and closes the gap in the source through `TicketPositions.shift`.
- It renders `{ ticket: ticket_json }`, then broadcasts `BoardBroadcast.tickets_shifted` (when anything shifted) and `tickets_upserted`, and calls `Notifier.item_changed` with `"status"` (`NOTIFIED_FIELDS` maps `column_id` to `status`).
- Existing tests in `backend/test/controllers/tickets_controller_test.rb` cover backlog to column ("moving from the backlog to a column puts the ticket at the bottom of that column"), column to backlog ("to_backlog moves a column ticket to the bottom of the backlog"), column to column with a position, unknown columns, the broadcasts and density.

One known server behaviour the frontend must respect: sending the ticket's own `column_id` without a position moves it to the bottom of its own column. The popup therefore never sends a change when the picked status equals the current one (`DropdownComponent.select` already skips emitting an unchanged value; the handler checks again).

### Frontend

- `frontend/src/app/pages/dashboard/ticket-detail/ticket-detail.component.ts`:
  - New getter `statusOptions: DropdownOption[]` built from `this.state.statuses`: `{value: null, labelKey: status.title}` for the Backlog (its title is the `PHRASES.BACKLOG` key) and `{value: status.columnId, label: status.title}` for each column, in that order (the same mapping as `TicketSelectionBarComponent.statusOptions`).
  - New `handleStatusChange(value: string | number | null)`: does nothing without a ticket or when the value equals `ticket.columnId`; `null` calls `ticketService.moveToBacklog(teamCode, boardId, ticketId)`, a number calls `ticketService.moveTicket(teamCode, boardId, ticketId, {columnId: Number(value)})`; both go through the existing private `applyMove`.
  - Remove `isMoveDialogOpen`, `handleMoveToBacklog`, `handleOpenMoveDialog`, `handleMoveCancelled`, `handleMoveToColumn`, and the `MoveToBoardDialogComponent` import. `ButtonComponent` stays imported only if something else in the template still uses `app-button`; otherwise remove it.
- `ticket-detail.component.html`:
  - Remove the two `app-button` move buttons from `.ticketDetail__headerActions`, and the `app-move-to-board-dialog` block.
  - Add as the first child of `.ticketDetail__side`:
    ```html
    <div class="ticketDetail__field">
      <h3 class="ticketDetail__fieldTitle">{{ PHRASES.STATUS | translate }}</h3>
      <app-dropdown
        class="ticketDetail__status"
        [options]="statusOptions"
        [value]="ticket.columnId"
        [ariaLabel]="PHRASES.STATUS"
        (valueChange)="handleStatusChange($event)"
      ></app-dropdown>
    </div>
    ```
- `ticket-detail.component.css`: extend the existing `.ticketDetail__priority { display: block; }` rule to `.ticketDetail__status, .ticketDetail__priority`.
- `frontend/src/app/config/phrases.ts`: add `STATUS: 'STATUS'` directly above `PRIORITY`.
- Every file in `frontend/public/assets/translations/`: add `"STATUS"` directly above `"PRIORITY"`, reusing each language's existing `FILTER_STATUS` word: en "Status", lv "Statuss", et "Olek", lt "Būsena", ru "Статус", sv "Status", fi "Tila", de "Status", da "Status", fr "Statut", es "Estado".
- `PHRASES.MOVE_TO_BACKLOG` and `PHRASES.MOVE_TO_BOARD` stay: the Kanban card and the List row still use them. `MoveToBoardDialogComponent` stays: the List tab still uses it.
- `CLAUDE.md` (Frontend > Services and HTTP, the board paragraph): mention that the ticket popup's sidebar starts with a Status dropdown (Backlog plus the columns) that moves the ticket to the bottom of the chosen status, next to the existing "chosen in the ticket popup's Priority dropdown" sentence.

### Parallel work

- `dialog-accessibility.spec.md` owns the ticket popup shell (`.ticketDetailOverlay` / `.ticketDetail` semantics, focus trap and restore) and the `move-to-board-dialog` component. This spec removes the popup's use of `app-move-to-board-dialog` and the two header move buttons, and adds one sidebar field; it does not touch the overlay, backdrop or dialog component. If the other branch adds attributes to the removed `app-move-to-board-dialog` block in `ticket-detail.component.html`, drop that block when merging.
- `trash-undo-without-confirm.spec.md` changes the popup's Delete confirm (`showDeleteConfirm`, `handleDelete`, `handleConfirmDelete`). Leave those untouched here.
- `kanban-card-readability.spec.md` relies on the popup offering every action that cards hide on touch screens; the Status field covers moving.
- Translation files and `phrases.ts` are edited by many specs: put the new key next to `PRIORITY`, not at the end.

## 2.3 Decisions

1. **Control type (2026-11-04):** a single-select `app-dropdown` listing Backlog and the columns. Reason: Nielsen #1 visibility of system status (current status always shown) and #4 consistency: Priority, the field right below, is the same dropdown, and status dropdowns in the ticket sidebar are the known Jira/Linear pattern (Impeccable operate.md "earned familiarity", "Consistent affordances across the surface"). Rejected: a segmented control or chips (columns are user-defined and can be many or long); keeping the header buttons and adding the field (two controls for one action, Nielsen #8 minimalist design).
2. **Placement (2026-11-04):** first field of the sidebar, above Priority. Reason: status is the field people check first on a ticket (Impeccable layout.md "Let hierarchy follow product priority"); placing it in the sidebar groups it with the other ticket attributes rather than with the item actions in the header.
3. **Remove the header move buttons and the popup's Move to board dialog (2026-11-04):** yes. Reason: the dropdown does both in one step and also covers column-to-column moves, which had no path; keeping them duplicates the action (Nielsen #8) and the dialog is "a modal for a task that needs neither interruption nor protected focus" (Impeccable craft-floor Refuse list, operate.md "Modal as first thought").
4. **Position in the target (2026-11-04):** bottom of the chosen column or Backlog. Reason: matches the server default, the List tab's bulk "Set status" and the existing Move to backlog / Move to board actions (Impeccable polish.md "Match neighboring mental models"). Rejected: top of the column (differs from every other move without a drop position).
5. **Optimistic or pessimistic (2026-11-04):** pessimistic: the dropdown shows the new status after the server responds, a failure shows the existing toast. Reason: the Priority dropdown next to it behaves the same way, and `applyMove` already places the returned ticket in the shared board (Impeccable polish.md "Match … optimistic or pessimistic patterns"). The request is short and the dropdown is controlled by `ticket.columnId`, so no extra busy state is added.
6. **Label (2026-11-04):** new key `STATUS` ("Status") instead of reusing `FILTER_STATUS`. Reason: the field label and the filter label are different concepts that happen to share a word today; a separate key lets either change without the other. Translations reuse each language's `FILTER_STATUS` wording for consistency (Nielsen #4).
7. **Backend (2026-11-04):** no change. Reason: `TicketsController#update` already supports `column_id` and `to_backlog` without a position, with shifts, broadcasts and the "status" notification, and the existing controller tests cover these paths (see Part 2.2). The only gap, same-column `column_id` moving the ticket to the bottom, is avoided on the client by never sending an unchanged status.

### Decisions to double-check

- Decision 3 removes the popup's "Move to backlog" / "Move to board" header buttons and its Move to board dialog. The critique only asked for a Status control; removing the old path is a scope call beyond it.
- No backend change and no new permission: anyone who can open the ticket can change its status, exactly as with the current move buttons and drag and drop.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Phrase
- [ ] A1. Add `STATUS: 'STATUS'` above `PRIORITY` in `frontend/src/app/config/phrases.ts`, and `"STATUS"` above `"PRIORITY"` in all 11 files in `frontend/public/assets/translations/` with the words listed in Part 2.2.

### B. Popup logic
- [ ] B1. In `ticket-detail.component.ts` add the `statusOptions` getter and `handleStatusChange` as described in Part 2.2, and remove `isMoveDialogOpen`, `handleMoveToBacklog`, `handleOpenMoveDialog`, `handleMoveCancelled`, `handleMoveToColumn` and the `MoveToBoardDialogComponent` import (and `ButtonComponent` if the template no longer uses `app-button`).
- [ ] B2. Update `ticket-detail.component.spec.ts`: replace the tests "moves a board ticket to the backlog and updates the board", "moves a backlog ticket to the chosen column" and "shows a toast when a move fails" with tests for `handleStatusChange`: choosing Backlog (`null`) for a column ticket calls `moveToBacklog` and places the ticket at the bottom of `state.board.backlog`; choosing a column for a backlog ticket calls `moveTicket(..., {columnId})` and places it in that column; choosing another column for a column ticket calls `moveTicket` with the new column (the path that had no UI before); choosing the current status sends nothing; a failed move shows the `TICKET_MOVE_FAILED` toast and keeps `ticket.columnId` and the board unchanged. Add a test that `statusOptions` lists Backlog (`labelKey` `PHRASES.BACKLOG`, value `null`) first and then the board's columns in order with their titles. Add a test that `applyRemoteChange` with a summary in another column updates `ticket.columnId` (the dropdown's value), if no existing test already asserts `columnId`.

### C. Popup template
- [ ] C1. In `ticket-detail.component.html` remove the two header move buttons and the `app-move-to-board-dialog` block, and add the Status field as the first child of `.ticketDetail__side` (Part 2.2). Extend the `.ticketDetail__priority` rule in `ticket-detail.component.css` to `.ticketDetail__status`.
- [ ] C2. Add a DOM test in `ticket-detail.component.spec.ts` (the file already uses `TestBed` and `By` for the description editor; follow that setup): the sidebar's first field title is the Status phrase and its `app-dropdown` receives `ticket.columnId` as `value`; the header no longer contains a Move to backlog or Move to board button.

### D. Docs
- [ ] D1. Update the board paragraph in `CLAUDE.md` as described in Part 2.2.

### Z. Wrap-up
- [ ] Z1. Full test runs (`npm test` in `frontend/`, `bin/rails test` in `backend/`), `npm run build`, and confirm with `git diff --stat` that `backend/` is untouched (so backend lint and Brakeman have nothing new to check).
- [ ] Z2. Manual check in the running app with two browser sessions on the same board: open a column ticket from the Kanban tab, the Status field shows its column; pick another column, the card moves to the bottom of that column behind the popup; pick Backlog, it leaves the board columns; open a backlog ticket from the List tab and pick a column, it moves to that group's bottom; in the second session the moves appear live, and moving the ticket there updates the open popup's Status field. Check keyboard use: Tab to the Status field, open it with Enter or ArrowDown, pick with the arrows and Enter.
