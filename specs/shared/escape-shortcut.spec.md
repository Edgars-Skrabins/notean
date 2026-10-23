# Escape shortcut — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

Pressing Esc closes the topmost popup or navigates back from full-page menus, like most desktop apps.

- **Users:** everyone, with a keyboard.
- **Usage, the innermost thing that uses Esc wins:**
  1. **Inner controls first.** If something inside handles Esc, it consumes it and nothing else happens. This covers:
     - an open dropdown
     - the global search panel
     - the header user menu
     - an inline rename or create input (folder and item rename, board title, backlog create)
     - the ticket title and description fields
     - the diagram label editor
     - a diagram selection
  2. **Otherwise the topmost layer closes:**
     - **Dialogs** (confirm, new folder, new board, new project, delete folder, delete project, move to board, project settings): Esc acts as Cancel.
     - **Page or diagram popup, view mode:** closes (like X).
     - **Page or diagram popup, edit mode:** without changes, it leaves edit mode (back to view). With unsaved changes, it opens a "Discard unsaved changes?" confirmation. Confirm discards and returns to view mode, and Esc or Cancel in the confirmation keeps editing.
     - **Page or diagram popup, create mode** (`create-on-confirm.spec.md`): the same as Cancel there (closes when untouched, otherwise asks to discard).
     - **Ticket popup:** closes (like X).
  3. **Otherwise, full pages navigate back** (same as their back button, so unsaved-changes guards still ask):
     - Settings and Profile → dashboard
     - Manage team → dashboard
     - Switch team → dashboard
     - Project page → projects list
  4. A second Esc then handles the next layer down. For example: Esc closes a dropdown, the next Esc closes the popup.
- **Rules:**
  - Only one action per key press.
  - Esc does nothing on screens with nothing to close (the dashboard lists, Home, boards without a popup, auth pages).
  - Esc while typing in the rich-text editor counts as "in the popup": it goes to the edit-mode rule above. It does not clear the text.
- **Out of scope:** other shortcuts, and a shortcut help overlay.

# Part 2 — Technical details

## 2.1 Tools and libraries
Angular `HostListener` on `document:keydown.escape`, a root service, CDK overlays (which already handle their own Esc in the dropdown). No new dependencies.

## 2.2 Structure

**`services/escape.service.ts`** (`EscapeService`, `providedIn: 'root'`):
- A stack of handlers. `push(handler: () => void): () => void` registers a layer and returns an unregister function.
- A `document:keydown` listener (registered once, for example from `AppComponent` or with `fromEvent` in the service) handles `Escape`:
  - When `event.defaultPrevented` is true, an inner control consumed it, so do nothing.
  - Otherwise call the top handler and `preventDefault()`.

**Inner controls must mark Esc as consumed** by calling `event.preventDefault()` (and `stopPropagation()` where they already use it). Check and fix each:
- `dropdown.component.ts`
- `global-search.component.ts`
- the header user menu (`dashboard-header`, which needs an Esc handler that closes the menu)
- `item-tree` rename input
- `board-page` title input
- `backlog-tab` create input
- `kanban-column` inputs
- `ticket-assignees`
- `ticket-detail` title and description fields
- `flowchart-editor` label editor and selection clearing (consume only when there was something to clear)

**Layers.** Each registers in `ngOnInit` (or when it opens) and unregisters in `ngOnDestroy`:
- every dialog component (`confirm-dialog`, `create-named-item-dialog`, `new-project-dialog`, `delete-folder-dialog`, `delete-project-dialog`, `move-to-board-dialog`, and `project-settings-dialog` from `projects-redesign.spec.md`) → emits `cancelled` (or `closed`)
- `item-detail-layout` → emits a new `escapePressed` output. `FolderedItemDetailComponent.handleEscape()` applies the mode rules from Part 1.
- `ticket-detail` → `handleGoBack()`
- `settings`, `profile`, `manage-team`, `switch-team` and `project-detail` → their `handleGoBack()`

Because dialogs open after their parent layer, they sit on top of the stack and close first.

**Discard confirmation in edit mode:**
- `FolderedItemDetailComponent` gets `showDiscardEditConfirm` and `hasEditChanges` (drafts compared to `item.title` and `item.content`).
- The layout shows a `confirm-dialog` with `CONFIRM_DISCARD_CHANGES`. Reuse create mode's discard plumbing if `create-on-confirm` is merged.

**Phrases:** `CONFIRM_DISCARD_CHANGES` ("Discard unsaved changes?") in `PHRASES` and every translation file.

## 2.3 Decisions
1. **Edit mode with changes:** ask before discarding. Ignoring Esc while editing was rejected.
2. **Pages that go back on Esc:** Settings, Profile, Manage team, Switch team and the project page.
3. **Priority:** innermost first. An inner control that uses Esc consumes it, and only then does the popup close. Always closing the popup was rejected.
4. **Mechanism:** one root `EscapeService` stack with `defaultPrevented` as the "consumed" signal. Per-component `document` listeners were rejected because several would fire at once. (Implementation choice, not one the user asked for.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Prerequisites:** `create-on-confirm.spec.md` and `projects-redesign.spec.md` should be merged, since this spec registers layers in their create mode and settings popup. If either isn't merged, stop and ask the user whether to proceed without those parts (and add them later).

**Overlaps with other specs:** `detail-close-button-placement`, `radius-and-spacing` and `ticket-priorities` also touch `item-detail-layout`, `ticket-detail` and the dialogs. `tooltips.spec.md` makes tooltips hide on Esc, and its tooltip must not consume Esc. If any is in progress on another branch, stop and ask the user before editing the shared files.

Baseline before starting: run `npm test` in `frontend/` and note the count here.

### A. Service
- [ ] A1. Add `EscapeService` with the stack and the single listener.
- [ ] A2. Add `escape.service.spec.ts`:
  - the top handler runs
  - an unregistered handler doesn't run
  - a `defaultPrevented` event runs nothing
  - only one handler runs per key press

### B. Inner controls
- [ ] B1. Make every inner control in 2.2 call `preventDefault()` on Esc when it consumes it, and add Esc closing to the header user menu. Extend the existing specs where a component has one (dropdown, global search).

### C. Layers
- [ ] C1. Register every dialog component as a layer that cancels.
- [ ] C2. Add `escapePressed` to `item-detail-layout`, add `handleEscape` with the view, edit and create rules to `FolderedItemDetailComponent`, and add the edit-mode discard confirmation and phrase.
- [ ] C3. Register `ticket-detail`, `settings`, `profile`, `manage-team`, `switch-team` and `project-detail`.
- [ ] C4. Tests for `handleEscape`:
  - view closes
  - edit without changes returns to view
  - edit with changes asks
  - create follows the cancel rules

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Update `CLAUDE.md` (Frontend services) to mention `EscapeService`.
- [ ] Z3. Manual check in the running app, going through every case in Part 1:
  - A dropdown in a popup closes first, then the popup.
  - Editing a page with changes asks.
  - Renaming a folder, Esc cancels the rename only.
  - Editing a diagram label, Esc cancels the label only.
  - Settings with unsaved changes: Esc triggers the guard.
  - Nothing happens on Home.
