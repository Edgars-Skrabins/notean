# Edit conflict detection — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Two people can edit the same page, diagram or ticket at once, and today the last save silently wins. The "X is editing" notice is informational only. This spec adds a version check on save, so a save based on an outdated version is rejected and the user chooses what to do.

- **Users:** team members editing pages, diagrams, and ticket titles or descriptions.
- **Usage:**
  - Editing stays open to everyone. Nothing is locked, and the "X is editing" notice stays as it is.
  - When a save is rejected because someone saved in the meantime, a dialog opens: "Someone saved a newer version while you were editing." It has two buttons:
    - *Load latest*: discards my changes and shows the newer version. For pages and diagrams this leaves edit mode.
    - *Overwrite*: saves my version over theirs.
  - Esc or closing the dialog keeps me in edit mode with my draft untouched, so I can copy what I need first.
  - **Tickets:** the same dialog appears when a title or description save in the ticket popup conflicts. Moving a ticket, changing its column, priority or position, assignees and bulk actions never conflict.
- **Rules:**
  - Each page, diagram and ticket has a version number that goes up on every save.
  - A save of page or diagram content and title, or of ticket title and description, must send the version it started from. A mismatch rejects the save with 409 `EDIT_CONFLICT` and the current version of the item.
  - *Overwrite* resends the same changes with the current version from the conflict response. If yet another save happened in between, the dialog appears again.
  - Ticket updates that don't touch title or description don't send a version and are never rejected. They still bump the version, so an open title edit based on the older version conflicts.
- **Out of scope:**
  - Merging changes or showing a diff.
  - Exclusive edit locks.
  - Live co-editing.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies. Uses Rails optimistic locking (`lock_version`).

## 2.2 Structure

**Data model:** edit `backend/db/migrate/20261025120000_create_schema.rb` and rebuild the databases. Add `lock_version` (integer, default 0, null false) to `pages`, `diagrams` and `tickets`. Rails then checks and increments it automatically on every `save`.

**API:**
- `PagesController#update` and `DiagramsController#update`: permit `lock_version` in `update_page_params` and `update_diagram_params`. When the request changes `title` or `content`, `lock_version` is required. A missing one means 422 `Common::LOCK_VERSION_REQUIRED`. Assign it to the record before saving. Rescue `ActiveRecord::StaleObjectError` and render 409 with `{ code: "EDIT_CONFLICT", page: page_json(reloaded) }` (or `diagram:`), using `render_error`'s `extra:` option. If `delete-account.spec.md` hasn't added that option yet, add it here.
- Updates that only change `folder_id` or `project_id` (moving an item) don't need `lock_version`. The controller assigns the record's current `lock_version`, so they never conflict.
- `TicketsController#update`: permit `lock_version` in `update_ticket_params`.
  - When `title` or `description` is present, `lock_version` is required and checked as above. A conflict responds 409 `{ code: "EDIT_CONFLICT", ticket: ticket_json(reloaded) }`.
  - Otherwise the current version is used and no conflict is possible.
  - `bulk_update`, drag moves (`update_columns`/reindexing in `insert_and_reindex`) and assignee changes don't check versions. Code paths that use `update_column`/`update_all` don't bump `lock_version`, and that's acceptable, since only title or description edits are protected.
- Page, diagram and ticket JSON (`page_json`, `diagram_json`, `TicketJson#ticket_json` and the summary helpers used by the board) include `lock_version`.
- `EDIT_CONFLICT` and `LOCK_VERSION_REQUIRED` go in `backend/app/errors/error_codes/common.rb`.

**Frontend:**
- Models: `lockVersion` on `FolderedItem` (`models/foldered-item.model.ts`) and on the ticket models (`models/ticket.model.ts`), mapped in the `map*` functions.
- `FolderedItemService.save` sends `lock_version` with title or content changes. On 409 `EDIT_CONFLICT` it returns `{ success: false, code: 'EDIT_CONFLICT', latest }` with the mapped latest item. `TicketService.update` does the same when sending title or description.
- `config/errorCodes/common.ts`: both codes.
- New shared component `components/edit-conflict-dialog` (standalone; `.ts`, `.html`, `.css`), built like `app-confirm-dialog`:
  - Outputs `loadLatest` and `overwrite`.
  - Pushes an Esc layer through `EscapeService` that closes it, which counts as *keep editing*.
- `FolderedItemDetailComponent` (`pages/dashboard/foldered-item-detail.base.ts`):
  - Keeps the loaded `lockVersion`.
  - On conflict, stores `latest` and opens the dialog.
  - *Load latest* replaces the item and leaves edit mode.
  - *Overwrite* resaves the draft with `latest.lockVersion`.
- `TicketDetailComponent` (`pages/dashboard/ticket-detail`) handles title and description conflicts the same way. *Load latest* replaces the fields and updates the shared board through `BoardPageStateService.updateTicket`.
- i18n: dialog message, both button labels, and `ERRORS.COMMON.EDIT_CONFLICT` and `ERRORS.COMMON.LOCK_VERSION_REQUIRED` in every translation file.

## 2.3 Decisions
1. **Version check or edit lock?** A version check on save (optimistic locking with `lock_version`). Editing stays open. Rejected: an exclusive lock (blocks people, and stale locks linger), and both together. (2026-10-26)
2. **Conflict UI?** A dialog with *Load latest* and *Overwrite*. Rejected: load-latest only (loses work), and a side panel with the unsaved draft (more UI). (2026-10-26)
3. **Scope?** Pages, diagrams, and ticket title and description. (2026-10-26)
4. **Which ticket updates are checked?** Only title or description edits. Moves, column, priority, assignees and bulk actions never conflict, so drag-and-drop isn't interrupted. (2026-10-26, derived from decision 3)
5. **Closing the dialog?** It keeps the draft in edit mode, so nothing is lost by accident. (2026-10-26, recorded while writing the spec)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` and `npm test` and note the counts.

### A. Data model
- [ ] A1. Add `lock_version` to `pages`, `diagrams` and `tickets` in the `create_schema` migration and rebuild the dev and test databases.

### B. API
- [ ] B1. Add `EDIT_CONFLICT` and `LOCK_VERSION_REQUIRED` to `error_codes/common.rb`, plus the `render_error` `extra:` option if it's missing.
- [ ] B2. Pages and diagrams: permit and require `lock_version` for title or content changes, return 409 with the latest item, and include `lock_version` in the JSON. Controller tests:
  - A save with the current version succeeds and increments it.
  - A stale version returns 409 with the latest item.
  - A missing version on a content change returns 422.
  - A folder-only move without a version succeeds.
- [ ] B3. Tickets: version checks only for title or description, with `lock_version` in all ticket JSON. Tests:
  - A stale title edit returns 409.
  - A column move without a version succeeds.
  - A title edit based on the version from before a move conflicts.
  - Bulk update is unaffected.

### C. Frontend
- [ ] C1. Add `lockVersion` to the models and mappers, plus the error codes. Update fixtures in `testing/` (e.g. `boardFixtures.ts`) and existing specs broken by the new field.
- [ ] C2. Send versions and return `latest` on 409 in `FolderedItemService.save` and `TicketService.update`. Spec tests for the conflict mapping.
- [ ] C3. Add the `edit-conflict-dialog` component with its Esc layer. Spec tests: outputs, and Esc closes it.
- [ ] C4. Page and diagram detail conflict flow. Spec tests: *Load latest*, *Overwrite* (resends with the new version) and close (keeps the draft).
- [ ] C5. Ticket popup conflict flow for title and description. Spec tests.
- [ ] C6. Add `PHRASES` keys and translations to every file in `public/assets/translations/`.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md`.
- [ ] Z2. Manual check in the running app, with two browsers on the same page:
  - Both enter edit mode, A saves, then B saves and sees the dialog.
  - Try *Overwrite*, and in a second round *Load latest*.
  - Repeat with a ticket description, then move that ticket in one browser and confirm the other's description save conflicts.
