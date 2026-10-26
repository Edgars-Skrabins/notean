# Live board updates — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

When several people have the same board open, nobody sees anyone else's changes until they reload. This spec makes every change on a board appear live for everyone viewing it. It also consolidates the app's WebSocket connections into one shared connection.

- **Users:** team members with a board open in any tab (Overview, Kanban or List), with or without a ticket popup.
- **Usage:**
  - Changes made by others appear within a moment, without a reload:
    - Tickets: created, edited (title, description, priority), moved between columns, the backlog and positions, deleted, and bulk moved or deleted.
    - Assignees: added and removed.
    - Columns: created, renamed and deleted.
    - Priorities: created, edited, reordered and deleted.
    - The board: renamed.
  - **Ticket popup open:**
    - When someone else changes that ticket, fields I'm not editing update live. A field I'm editing (title input focused, or description being edited) keeps my draft; saving it goes through the version check from `edit-conflict-detection.spec.md`.
    - If the ticket is deleted, the popup closes with the toast "This ticket was deleted".
  - **Board deleted:** everyone on it goes to Home with the toast "This board was deleted".
  - **Board moved to a project I can't see:** I go to Home with the toast "You no longer have access to this board".
  - **Board moved to another project I can still see:** the board updates in place.
  - My own changes behave as today. Receiving my own broadcast changes nothing visible.
- **Rules:**
  - Only people who can open the board receive its updates: active team members, with the boards feature on, who can see the board's project. This is checked when they subscribe.
  - Updates carry the changed records as JSON, the same shape the REST endpoints return, and clients apply them to the board they already loaded.
- **Out of scope:**
  - Live updates of the sidebar board list, Home, My Work or Favorites when a board or ticket changes elsewhere.
  - Showing who else is viewing the board.
  - Live updates for pages and diagrams beyond the existing editing presence.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies. ActionCable (`@rails/actioncable` on the frontend).

## 2.2 Structure

**Shared cable connection (frontend):**
- New `services/cable.service.ts` (`providedIn: 'root'`) owns the single `Consumer`:
  - It creates it lazily from `baseUrl` and the auth token, exactly as the cable URL is built today.
  - `subscribe(params, callbacks)` returns the `Subscription`.
  - `disconnect()` is called from `SessionService.clear()` on logout and 401.
- `EditingService` and `TeamChannelService` stop creating their own consumers and subscribe through `CableService`. Their `disconnect()` only unsubscribes their subscription.

**Backend channel:**
- New `backend/app/channels/board_channel.rb`, with param `board_id`:
  - It subscribes when the board exists, the user is an active member of its team, `boards` is enabled, and `ProjectAccess.new(current_user, team).visible?(board)` is true. Otherwise it rejects.
  - It streams `board:<id>` (`BoardChannel.stream_name(board)`).
- New `backend/app/models/board_broadcast.rb`, a plain class with one method per event, each calling `ActionCable.server.broadcast(BoardChannel.stream_name(board), payload)`. Payloads reuse the controllers' JSON helpers, so the helpers are called from the controllers and the built hash is passed in. All payloads have a `type`:

| `type` | payload | sent from |
|---|---|---|
| `tickets_upserted` | `tickets: [ticket summary JSON]` (every ticket whose column or position changed, as returned today) | `TicketsController` create, update, bulk_update; `TicketAssigneesController` create and destroy |
| `tickets_removed` | `ticket_ids: [...]` | `TicketsController` destroy and bulk_destroy |
| `columns_changed` | `columns: [...]`, plus `tickets: [...]` when deleting a column moves tickets | `ColumnsController` create, update, destroy |
| `priorities_changed` | `priorities: [...]` (all of the board's, with `ticket_count`) plus `tickets` when a delete clears tickets | `PrioritiesController` create, update, destroy |
| `board_updated` | `board: { id, title, project_id }` | `BoardsController#update` |
| `board_deleted` | `{}` | `BoardsController#destroy` |
| `access_changed` | `{}` | `BoardsController#update` when `project_id` changed (after `ProjectAccessCleanup`) |

**Frontend board handling:**
- New `services/board-channel.service.ts`:
  - It isn't root-provided. It's provided by `BoardPageComponent` alongside `BoardPageStateService`.
  - It subscribes through `CableService` when the board page opens and unsubscribes on destroy.
  - It applies messages to `BoardPageStateService`:
    - `tickets_upserted` goes to `applyTickets`.
    - `tickets_removed` goes to `removeTickets`.
    - `columns_changed` and `priorities_changed` go to new `setColumns` (plus `applyTickets`) and the existing `setPriorities`.
    - `board_updated` goes to a new `setBoardMeta`.
    - `board_deleted` navigates to Home with a toast.
    - `access_changed` calls `reload()`. A `NOT_FOUND` result navigates to Home with the access toast.

  Applying a payload is idempotent (replace by id), so the sender's own echo is harmless.
- `TicketDetailComponent` watches its ticket in `BoardPageStateService`. When it changes remotely, it updates fields that aren't being edited (tracked by a focused or editing flag per field). When the ticket disappears, it closes the popup (the same navigation as its close button) and shows a toast.
- i18n: the three toasts in `PHRASES` and every translation file.

## 2.3 Decisions
1. **How do updates travel?** As changed records broadcast on a per-board channel and applied locally. Rejected: a "changed" ping followed by a refetch (more traffic, and it resets drag state). (2026-10-26)
2. **Which changes are live?** Everything on the board: tickets, assignees, columns, priorities, board rename and delete. Rejected: tickets only. (2026-10-26)
3. **Open ticket popup?** Fields not being edited refresh; the popup closes with a toast if the ticket is deleted. Rejected: only closing on delete. (2026-10-26)
4. **Connections?** A shared `CableService` with one consumer for editing, team and board channels, built first. Rejected: a third consumer. (2026-10-26)
5. **Board project changes?** An `access_changed` event makes clients reload. Anyone who lost access is sent Home. (2026-10-26, recorded while writing the spec, following decision 2)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` and `npm test` and note the counts.

### A. Shared cable connection
- [ ] A1. Add `services/cable.service.ts` with spec tests: one consumer shared across subscriptions, and `disconnect()` resets it.
- [ ] A2. Move `EditingService` and `TeamChannelService` onto `CableService` and call `CableService.disconnect()` from `SessionService.clear()`. Update their specs. Existing editing presence and feature-flag behaviour must still pass.

### B. Backend channel and broadcasts
- [ ] B1. Add `BoardChannel` with the subscribe checks. Channel tests: a member subscribes, and these are rejected:
  - A non-member.
  - A member when boards is disabled.
  - A member who can't see the board's project.
- [ ] B2. Add `BoardBroadcast` and broadcast from `TicketsController` (create, update, destroy, bulk_update, bulk_destroy) and `TicketAssigneesController`. Tests with `assert_broadcast_on` for each action's payload.
- [ ] B3. Broadcast from `ColumnsController`, `PrioritiesController` and `BoardsController` (update, destroy, `access_changed`). Tests per action.

### C. Frontend board updates
- [ ] C1. Add `setColumns` and `setBoardMeta` to `BoardPageStateService`, with spec tests.
- [ ] C2. Add `board-channel.service.ts`, provided by `BoardPageComponent`, applying each message type. Spec tests:
  - Each type updates state.
  - The echo of my own change is a no-op.
  - `board_deleted` navigates with a toast.
  - `access_changed` with a not-found reload navigates with a toast.
- [ ] C3. `TicketDetailComponent` live field refresh and close on delete. Spec tests: a remote title change updates an unfocused title and keeps a focused draft; a deleted ticket closes with a toast.
- [ ] C4. Add the `PHRASES` keys and translations to every file in `public/assets/translations/`.

### D. Docs
- [ ] D1. Update the root `CLAUDE.md`: Realtime now goes through `CableService` (one consumer). Add `BoardChannel` and its event types under Channels and Services.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md`.
- [ ] Z2. Manual check in the running app, with two browsers on the same board:
  - Create, move, bulk-move and delete tickets; add an assignee; rename and delete a column; add a priority; rename the board. Each shows up in the other browser live.
  - With a ticket open in B, edit its title in A (B updates), then delete it in A (B's popup closes).
  - Delete the board in A; B goes Home.
  - Confirm only one WebSocket connection per tab in the browser network panel.
