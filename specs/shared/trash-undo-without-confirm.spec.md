# Trash undo without confirm — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

Deleting a page, diagram, board, ticket or chat channel moves it to the trash, where it can be restored for 14 days, and the app already shows a "Moved to trash" toast with **Undo**. Even so, every one of these moves first opens a confirm dialog ("Move this page to the trash?" with a "Delete" button) that doesn't name the item. That's two safety nets for one reversible action: an extra click every time, and a dialog people learn to click through without reading. The confirms that guard truly permanent deletes don't name what they delete either.

This feature removes the confirm dialog from every reversible move to the trash and makes the Undo toast the safety net: it names what was moved and stays up while the pointer or keyboard focus is on it. Every remaining confirm, the ones for actions that can't be undone, names the item and the consequence and has a button that names the action.

- **Users:** every team member who deletes things: pages and diagrams (list rows and the detail popup), boards, tickets (Kanban card, List row, ticket popup, List bulk selection) and chat channels (channel settings). It also covers anyone who deletes something permanently (trash, templates, attachments, comments, chat messages, columns, folders, the team).
- **Usage, moves to the trash (no confirm any more):**
  1. The user presses a Delete control: the trash icon on a Pages/Diagrams tree row, *Delete* in the page or diagram popup, the board's trash icon, the trash icon on a Kanban card or List row, *Delete* in the ticket popup, the selection bar's trash icon, or *Delete channel* in channel settings.
  2. The delete request goes out right away. While it is running, the same control does nothing if pressed again (no duplicate request, no "not found" error from a second click).
  3. On success the item goes away exactly as it does today (row removed, popup closed, board or channel left for Home), and a toast says what moved: **"'Quarterly plan' moved to the trash"** for a single item, **"3 tickets moved to the trash"** for a bulk delete (or "1 ticket moved to the trash"). Titles longer than 60 characters are cut to 59 characters plus "…" in the toast.
  4. The toast has **Undo**. It stays for 6 seconds, and the countdown pauses while the pointer is over the toast or focus is inside it. It continues with the time that was left once the pointer leaves or focus moves out. Undo restores the trashed entries exactly as the Trash screen's Restore does today and shows "Restored".
  5. On failure the screen shows the error as it does today and nothing is removed.
- **Usage, chat channels:** deleting a channel from its settings closes the dialog, leaves the channel for Home and shows "'design-review' moved to the trash" with Undo, instead of today's plain "Channel moved to the trash". Undo brings the channel back in the sidebar for everyone who could see it (the restore already broadcasts `channel_upserted`).
- **Usage, confirms that stay:** each one names the item and the consequence, and its button names the action:

  | Action | Where | Why it keeps a confirm | New message (en) | Button |
  |---|---|---|---|---|
  | Delete forever | Trash row | permanent | unchanged: "Delete '{{title}}' forever? This can't be undone." | Delete forever (unchanged) |
  | Empty trash | Trash header | permanent | unchanged | Empty trash (unchanged) |
  | Delete column | Kanban column menu | the column itself is deleted for good; only its tickets go to the trash (and come back into the backlog) | "Delete column '{{title}}'? Its {{count}} tickets move to the trash." / "…Its 1 ticket moves to the trash." / empty column: "Delete column '{{title}}'?" | Delete column |
  | Delete folder | Pages/Diagrams tree folder | the dialog asks a real question (keep contents or trash them); the folder itself is deleted for good in keep mode | "Delete folder '{{title}}'?" (one translatable sentence instead of today's "Delete" + title fragments) | Delete (unchanged) |
  | Delete template | template list row, page/diagram template popup, board template screen | permanent | "Delete template '{{title}}'? This can't be undone. Items created from it are not affected." | Delete template |
  | Delete attachment | attachment list (ticket popup, page) | permanent | "Delete '{{name}}'? This can't be undone." | Delete attachment |
  | Delete comment | comment menu | permanent | "Delete this comment? This can't be undone." | Delete comment |
  | Delete chat message | message actions | permanent, for everyone | "Delete this message for everyone? This can't be undone." | Delete message |
  | Delete priority / tag | board Overview | permanent, clears it from tickets | unchanged (already named) | Delete (unchanged) |
  | Delete project | project settings | permanent, type-to-confirm | unchanged (already named) | unchanged |
  | Delete team | Manage team | permanent for every member | "Delete '{{name}}' and everything in it for all members? This can't be undone." | Delete team |
  | Delete account | Profile | permanent | unchanged | unchanged |
  | Remove member, change role, transfer ownership, leave team | Manage team, Switch team | not deletes; already named | unchanged | unchanged |

- **Rules:**
  - A move to the trash never asks for confirmation. A permanent delete always does, and the confirm names the item (by title or file name) wherever the item has one. Comments and chat messages have no title, so their confirms say "this comment" / "this message".
  - Permissions, the 14-day retention and what restore puts back are unchanged.
  - Deleting from the page or diagram popup is only offered in view mode (as today), so no unsaved draft is lost. Deleting from the ticket popup drops an unsaved title or description draft, as it does today after the confirm; Undo brings back the last saved version.
  - Undo is all-or-nothing, like Restore: a bulk delete comes back as a whole.
- **Out of scope:**
  - Dialog semantics, focus trap and focus restore for the remaining confirms (`dialog-accessibility`).
  - Where toasts sit and how they're announced (`announced-status-messages`).
  - Moving focus to a neighbouring row after a row is deleted: focus already falls back to the page after today's confirm closes, so this is no regression. Left for a later spec.
  - "Discard unsaved changes?" / "Leave without saving?" confirms: they aren't deletes.
  - Removing a favorite, assignee, tag or reaction, and deleting shapes inside the diagram editor: these never had a confirm and stay that way.
  - Making columns, folders in keep mode, comments, messages, attachments or templates trashable: that would be a data-model change.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing stack only: Angular, ngx-translate, axios services returning `Result`, Rails controllers and Minitest. No new dependencies.

## 2.2 Structure

### Backend
- `backend/app/controllers/chat_channels_controller.rb#destroy`: keep `Trash.move` but use its returned entry and respond `200 { trash_entry_ids: [entry.id] }` instead of `204`, matching the page, diagram, board and ticket deletes. The broadcast stays on its own line after the render.
- `backend/test/controllers/chat_channels_controller_test.rb`: the "delete moves the channel to trash and tells its viewers" test asserts `:ok` and that `trash_entry_ids` holds the new `TrashEntry` id.

### Frontend: toast
- `models/toast.model.ts`: `ToastOptions` gains `messageParams?: Record<string, string | number>`.
- `components/toast/toast.component.html`: the message renders `toast.message | translate: (toast.messageParams ?? {})`.
- The pause-on-hover/focus countdown is NOT implemented here: `announced-status-messages` owns it (`ToastService.pause` / `resume`, `paused` / `resumed` outputs). This spec relies on it; if this branch merges first, the Undo toast simply does not pause until that spec lands.

### Frontend: trash service
- `models/trash.model.ts`: `export type TrashedSubject = { title: string } | { ticketCount: number };`
- `services/trash.service.ts`: `notifyTrashed(teamCode, entryIds, subject: TrashedSubject)`. A title subject shows `TRASHED_ITEM` with `{title}` cut to 60 characters (59 plus `…` when longer, in a private helper). A count subject shows `TRASHED_TICKETS` or `TRASHED_TICKETS_ONE` with `{count}`. It still shows nothing for an empty `entryIds`, and Undo is unchanged.
- `services/chat.service.ts`: `deleteChannel` returns a new `DeleteChatChannelResponse = Result<{ trashEntryIds: number[] }, ChatErrors>` (in `models/chat.model.ts`) mapped from `trash_entry_ids`.

### Frontend: screens that drop the confirm
Each one calls its delete right away, guards against a second press while the request is running, and passes a `TrashedSubject`:

| Screen | Files | Today | After |
|---|---|---|---|
| Pages/Diagrams tree row | `components/item-tree/item-tree.component.{ts,html}`, `pages/dashboard/document-pages/document-pages.component.html`, `pages/dashboard/diagrams/diagrams.component.html`, `pages/dashboard/foldered-list-page.base.ts` | `itemPendingDeletion` + `app-confirm-dialog`, `deleteItemConfirmMessage` input | `requestDeleteItem` emits `deleteItem` directly; remove `itemPendingDeletion`, its handlers, the confirm and the `deleteItemConfirmMessage` input and bindings. `handleDeleteItem` skips ids already in a private `deletingItemIds` set and passes `{title}` of the item it finds in `items` or `searchItems` |
| Folder cascade | `pages/dashboard/foldered-list-page.base.ts` | `notifyTrashed(teamCode, ids)` | passes `{title}` of the folder from `folders` (the folder dialog stays) |
| Page/diagram popup | `pages/dashboard/foldered-item-detail.base.ts`, `pages/dashboard/page-detail/page-detail.component.html`, `pages/dashboard/diagram-detail/diagram-detail.component.html` | `showDeleteConfirm` → `handleConfirmDelete` | `handleDelete` deletes directly behind an `isDeleting` flag; remove `showDeleteConfirm`, `handleCancelDelete`, `handleConfirmDelete` and the page/diagram bindings `[confirmDeleteMessage]`, `[showDeleteConfirm]`, `(deleteConfirmed)`, `(deleteCancelled)`; passes `{title: item.title}` |
| Board | `pages/dashboard/board-page/board-page.component.{ts,html}` | `showDeleteConfirm` | `handleDelete` deletes directly behind `isDeleting`; confirm removed; `{title: state.board.title}` |
| Kanban card | `pages/dashboard/kanban-tab/kanban-tab.component.{ts,html}` | `ticketPendingDeletion` | `requestDeleteTicket` deletes directly; a private `deletingTicketIds` set guards repeats; `{title: ticket.title}`. The column confirm stays (see below) |
| List row | `pages/dashboard/list-tab/list-tab.component.{ts,html}` | `ticketPendingDeletion` | `requestDelete` deletes directly behind `deletingTicketIds`; `{title}` |
| List bulk | same | `isBulkDeleteConfirmOpen` | `requestBulkDelete` runs the bulk delete directly (already guarded by `isBulkBusy`); `{ticketCount: ids.length}` |
| Ticket popup | `pages/dashboard/ticket-detail/ticket-detail.component.{ts,html}` | `showDeleteConfirm` | `handleDelete` deletes directly, returning early when `isDeleting`; `{title: ticket.title}` |
| Chat channel | `components/chat-channel-settings-dialog/chat-channel-settings-dialog.component.{ts,html}`, `pages/dashboard/chat-page/chat-page.component.ts` | `isConfirmingDelete` + `CHANNEL_DELETED` toast | the button calls `handleDelete()` directly behind `isDeleting`; on success the dialog emits `deleted` with the `trashEntryIds`; the chat page navigates Home and calls `trashService.notifyTrashed(teamCode, ids, {title: channel.name})` instead of `leavePage(CHANNEL_DELETED)` |

`ConfirmDialogComponent` imports are removed from components that no longer use it (`item-tree`, `chat-channel-settings-dialog`, `board-page`, `ticket-detail`, `list-tab`; `kanban-tab` keeps it for columns).

### Frontend: confirms that stay, now naming the item
- `components/item-detail-layout/item-detail-layout.component.{ts,html}`: `confirmDeleteMessage` becomes optional (`@Input() confirmDeleteMessage = ''`) and renders with `| translate: {title: item?.title}`; add `@Input() confirmDeleteLabel = PHRASES.DELETE` passed to the confirm's `confirmLabel`. `pages/dashboard/template-detail/template-detail.component.html` passes `CONFIRM_DELETE_TEMPLATE` and `DELETE_TEMPLATE`.
- `components/template-list/template-list.component.html`: `{title: templatePendingDelete.title}`, `confirmLabel` `DELETE_TEMPLATE`.
- `pages/dashboard/board-template-detail/board-template-detail.component.html`: `{title: template.title}` (the saved title), `confirmLabel` `DELETE_TEMPLATE`.
- `pages/dashboard/kanban-tab/kanban-tab.component.html`: the column confirm picks `CONFIRM_DELETE_EMPTY_COLUMN`, `CONFIRM_DELETE_COLUMN_ONE` or `CONFIRM_DELETE_COLUMN` by `columnPendingDeletion.tickets.length` (a getter in the `.ts`), with `{title, count}`, `confirmLabel` `DELETE_COLUMN`. After the delete, `notifyTrashed` gets `{ticketCount: column.tickets.length}`.
- `components/delete-folder-dialog/delete-folder-dialog.component.html`: the title becomes `PHRASES.DELETE_FOLDER_CONFIRM_TITLE | translate: {title: folderTitle}`.
- `components/attachment-list/attachment-list.component.html`: `{name: pendingDelete.filename}`, `confirmLabel` `DELETE_ATTACHMENT`.
- `components/comment-item/comment-item.component.html`: `confirmLabel` `DELETE_COMMENT`.
- `components/chat-message/chat-message.component.html`: `confirmLabel` `DELETE_MESSAGE`.
- `pages/manage-team/manage-team.component.html`: `{name: teamName}`, `confirmLabel` `DELETE_TEAM`.

### Phrases and translations
In `config/phrases.ts` and every file in `frontend/public/assets/translations/` (en, lv, et, lt, ru, sv, fi, de, da, fr, es). Add each key next to its related keys, not at the end of the file:
- New: `TRASHED_ITEM` ("'{{title}}' moved to the trash"), `TRASHED_TICKETS` ("{{count}} tickets moved to the trash"), `TRASHED_TICKETS_ONE` ("1 ticket moved to the trash"), `CONFIRM_DELETE_COLUMN_ONE`, `CONFIRM_DELETE_EMPTY_COLUMN`, `DELETE_TEMPLATE` ("Delete template"), `DELETE_MESSAGE` ("Delete message").
- Changed text (all languages): `CONFIRM_DELETE_COLUMN`, `CONFIRM_DELETE_TEMPLATE`, `CONFIRM_DELETE_ATTACHMENT`, `CONFIRM_DELETE_COMMENT`, `CONFIRM_DELETE_MESSAGE`, `CONFIRM_DELETE_TEAM`, `DELETE_FOLDER_CONFIRM_TITLE` (now "Delete folder '{{title}}'?").
- Removed (no longer used): `CONFIRM_DELETE_PAGE`, `CONFIRM_DELETE_DIAGRAM`, `CONFIRM_DELETE_BOARD`, `CONFIRM_DELETE_TICKET`, `CONFIRM_DELETE_TICKETS`, `CONFIRM_DELETE_CHANNEL`, `CHANNEL_DELETED`, `MOVED_TO_TRASH`. Grep before removing each one; keep any key still used elsewhere.

### Parallel work
- `dialog-accessibility` owns `confirm-dialog`, `delete-folder-dialog`, the `item-detail-layout` popup and the ticket-detail popup shell. This spec only removes `app-confirm-dialog` usages, changes one title binding in `delete-folder-dialog.component.html` and adds two inputs to `item-detail-layout`. It does not touch the dialogs' markup or focus code.
- `announced-status-messages` owns the toast's live region and position. It also owns the pause/resume countdown (decision 3 here only depends on it). This spec adds `messageParams` only. Keep `[attr.role]` and the CSS untouched.
- `row-actions-keyboard-access` changes the CSS of `item-tree-row`, `comment-item`, `chat-message`, the attachment rows and `template-list`. This spec changes only their delete wiring and confirm bindings.
- `list-tab-polish` and `kanban-card-readability` change `list-row`, the selection bar and `kanban-ticket` markup and CSS. This spec only changes handlers in `list-tab` and `kanban-tab`.
- `manage-team-structure` restructures `manage-team.component.html`. This spec changes only the delete-team confirm's `message` and `confirmLabel` bindings.
- `ui-copy-consistency` edits many translation strings. Edit only the keys listed here, next to their neighbours.

## 2.3 Decisions
1. **Reversible moves to the trash get no confirm, only the Undo toast.** Reason: Impeccable clarify.md: "Prefer undo over confirmation when recovery is safe". Nielsen #3 and #5: an undo gives control without slowing every delete. Recovery is safe because everything is restorable for 14 days. Rejected: keeping confirms and adding names (still two safety nets for one action, and it trains click-through); confirms only for bulk deletes (bulk delete is just as restorable, all-or-nothing).
2. **The Undo toast names what moved** ("'X' moved to the trash", "N tickets moved to the trash"). Reason: clarify.md: "For destructive actions, name the object and consequence". Once the confirm is gone, the toast is the only feedback, and row deletes need to confirm which row went. Titles are cut at 60 characters so a 200-character title can't blow up the toast (harden.md, extreme lengths). Rejected: the generic "Moved to trash".
3. **The toast countdown pauses while hovered or focused.** Reason: WCAG 2.2.1 Timing Adjustable. A keyboard user tabbing to Undo, or a pointer user reaching for it, needs the toast to stay. Kept at 6 s: long enough with the pause, short enough not to pile up (`MAX_VISIBLE_TOASTS` is 3). Rejected: a longer fixed duration (still a race for keyboard users); a toast that never times out (clutter). Implemented by `announced-status-messages`, not here (2026-11-04, de-duplicated across the parallel specs).
4. **The column confirm stays.** The column row itself is destroyed; only its tickets go to the trash and come back into the backlog. Reason: clarify.md, confirm only when recovery isn't safe. The confirm now names the column and the ticket count.
5. **The folder delete dialog stays.** It asks a real question (keep nested contents or trash them), and keep mode deletes the folder for good. Its title becomes one translatable sentence with the folder name. Reason: clarify.md: "Write complete translatable messages rather than concatenated fragments".
6. **Board delete loses its confirm** even though it affects the whole team. Reason: the board and all its tickets come back with one Undo or from the Trash, which is the same safety as pages. Nielsen #4: one rule for every trash move.
7. **Repeat presses are ignored while a delete runs.** Reason: harden.md: "Prevent double-submission". Without the confirm, a double click would send a second delete and show a "not found" error.
8. **Every remaining confirm's button names the action** ("Delete template", "Delete attachment", "Delete comment", "Delete message", "Delete column", "Delete team") and its message names the item. Reason: clarify.md: "name the action on both the message and button". Comments and messages have no title, so they say "this comment" / "this message" and add "This can't be undone."
9. **Toast message params go through `ToastOptions.messageParams`** instead of pre-translated strings. Reason: the toast already translates its `message` key, and passing params keeps translation in the template (CLAUDE.md i18n convention).

### Decisions to double-check
10. **Chat channel delete now responds `200 { trash_entry_ids }`** instead of `204`, so the client can offer Undo like every other trash move. This changes the API, and CLAUDE.md's routes and trash notes get updated with it. Rejected: keeping the confirm for channels only (inconsistent, and the channel is restorable); restoring by looking the entry up on the client (no endpoint for that).
11. **Board and chat channel deletes, which affect every member, no longer ask first.** If you'd rather keep a confirm for team-wide containers (boards, channels), decisions 1 and 6 change for those two only.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Backend
- [ ] A1. In `backend/app/controllers/chat_channels_controller.rb#destroy`, keep the entry `Trash.move` returns and render `{ trash_entry_ids: [ entry.id ] }` (200) before the `ChatBroadcast.channel_removed` line. Update the delete test in `backend/test/controllers/chat_channels_controller_test.rb` to assert `:ok` and the returned id equals the channel's new `TrashEntry` id. Run `bin/rails test test/controllers/chat_channels_controller_test.rb`.

### B. Toast and trash service
- [ ] B1. Add `messageParams` to `ToastOptions` (`models/toast.model.ts`) and render it in `components/toast/toast.component.html`.
- [ ] ~~B2. Toast pause/resume.~~ Moved to `announced-status-messages` (owner of the toast countdown) to avoid two implementations.
- [ ] B3. Add `TrashedSubject` to `models/trash.model.ts` and change `TrashService.notifyTrashed` to take it, choosing `TRASHED_ITEM`, `TRASHED_TICKETS` or `TRASHED_TICKETS_ONE` with params and cutting titles over 60 characters. Update `services/trash.service.spec.ts`: title message and params, the 60-character cut, count and one-ticket messages, and that empty `entryIds` still shows nothing. Update `testing/trashServiceStub.ts` if its typing needs it.
- [ ] B4. Add the new phrases and change the texts listed in 2.2 in `config/phrases.ts` and all 11 translation files, next to related keys. Don't remove keys yet (that's E2).

### C. Remove confirms from moves to the trash
- [ ] C1. Pages/Diagrams tree: `item-tree` deletes without confirm (remove `itemPendingDeletion`, handlers, the confirm, the `deleteItemConfirmMessage` input and its bindings in `document-pages` and `diagrams`). In `foldered-list-page.base.ts`, add the `deletingItemIds` guard and the `{title}` subjects for item and folder-cascade deletes. Update `item-tree.component.spec.ts` (pressing delete emits `deleteItem` at once) and add a spec for the guard and subject in the Pages or Diagrams list spec.
- [ ] C2. Page/diagram popup: in `foldered-item-detail.base.ts`, `handleDelete` deletes directly behind `isDeleting` with `{title}`; remove the confirm state and handlers and the page/diagram template bindings. Add `confirmDeleteLabel` and make `confirmDeleteMessage` optional with `{title}` params in `item-detail-layout`. Pass `CONFIRM_DELETE_TEMPLATE` / `DELETE_TEMPLATE` from `template-detail.component.html`. Update `page-detail.component.spec.ts` for the direct delete (one request, goes back, toast subject).
- [ ] C3. Board: `board-page.component.{ts,html}` deletes directly behind `isDeleting`; update `board-page.component.spec.ts` (replace the `handleConfirmDelete` calls with `handleDelete`, plus a repeat-press test).
- [ ] C4. Tickets: `kanban-tab` card delete, `list-tab` row and bulk delete, and `ticket-detail` delete all run directly with their guards and subjects. Update `kanban-tab.component.spec.ts`, `list-tab.component.spec.ts` and `ticket-detail.component.spec.ts`: drop the confirm steps, assert the subjects, assert a second press while pending sends nothing.
- [ ] C5. Chat channel: `ChatService.deleteChannel` returns `trashEntryIds`; `chat-channel-settings-dialog` deletes directly behind `isDeleting` and emits the ids; `chat-page.component.ts` navigates Home and calls `notifyTrashed` with `{title: channel.name}`. Add or adjust specs for the dialog (one request, emits ids, error shown on failure) and the chat page handler.

### D. Name the item in the remaining confirms
- [ ] D1. Kanban column confirm: key by ticket count, `{title, count}`, `DELETE_COLUMN` label, and `{ticketCount}` for the toast. Extend `kanban-tab.component.spec.ts` to check the key chosen for 0, 1 and several tickets.
- [ ] D2. Template confirms in `template-list`, `board-template-detail` and `template-detail` (through `item-detail-layout`) with `{title}` and `DELETE_TEMPLATE`. Update `template-list.component.spec.ts` if it asserts the message.
- [ ] D3. `delete-folder-dialog` title, `attachment-list` (`{name}`, `DELETE_ATTACHMENT`), `comment-item` (`DELETE_COMMENT`), `chat-message` (`DELETE_MESSAGE`) and `manage-team` (`{name: teamName}`, `DELETE_TEAM`). Update `attachment-list`, `comment-item` and `manage-team` specs only where they assert the old bindings.

### E. Cleanup and docs
- [ ] E1. Remove `ConfirmDialogComponent` from the `imports` of components that no longer render it. Remove unused fields and handlers left behind.
- [ ] E2. Remove the unused phrase keys listed in 2.2 from `phrases.ts` and every translation file, after grepping that each is unused.
- [ ] E3. Update `CLAUDE.md`: the trash bullet (`notifyTrashed(teamCode, trashEntryIds, subject)`, the named toast that pauses on hover and focus, no confirm before a move to the trash, permanent deletes confirm and name the item) and the backend trash/chat routes note (chat channel delete now responds `200 { trash_entry_ids }`).

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test`, `npm run build` in `frontend/`; `bin/rails test`, `bin/rubocop` in `backend/`).
- [ ] Z2. Manual check in the running app: delete a page from the list and from its popup, a diagram, a ticket from a Kanban card, a List row and the ticket popup, three selected tickets in List, a board and a chat channel. Each one is gone at once, the toast names it, hovering or tabbing into the toast keeps it up, and Undo brings it back. A fast double click sends one request. Delete a column, a template, an attachment, a comment and a chat message, and check each confirm names the item and its button names the action.
