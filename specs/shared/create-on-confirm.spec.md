# Create pages and diagrams on confirm — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

Today "New page" (and "New diagram") creates an "Untitled" item on the server immediately, then opens it in edit mode. Saving switches the popup to view mode. Cancelling leaves an empty Untitled item behind.

New behaviour: "New page" opens the detail popup in **create mode**. Nothing exists on the server until the user presses **Create**. Create saves the item and closes the popup, the same way projects are created.

- **Users:** everyone who creates pages and diagrams.
- **Usage:**
  1. The user clicks "New page" (or "New diagram") in the list header, or the "+" on a folder row.
  2. The detail popup opens in create mode:
     - an empty title input with the placeholder
     - an empty content editor (rich text for pages, the flowchart editor for diagrams)
     - header actions `[Cancel] [Create] [X]`
     - no favorite or delete buttons and no editing banner
     - the sidebar shows only the **Project** picker (when the team has projects), preset to the header's selected project. There's no owner, contributors or dates yet.
  3. **Create** saves the title, content, project and folder (the folder whose "+" was used, or none). The popup closes and the user is back on the list, where the new item appears in its folder.
     - An empty title becomes "Untitled page" or "Untitled diagram", as today.
     - While the request runs, Create is disabled.
     - On failure the popup stays open with the error in its alert, and the draft is kept.
  4. **Cancel**, the X or a click on the backdrop:
     - if neither title nor content changed (and the project wasn't changed), the popup closes immediately
     - otherwise a confirmation asks "Discard this new page?" (or "…diagram?"). Confirm closes and discards, cancel returns to the draft.
- **Rules:**
  - No item is created until Create is pressed. Leaving create mode in any way creates nothing.
  - The created item's creator is the current user, and the project goes through the existing `assign_project` rules.
  - Edit mode for existing items keeps today's behaviour (Save returns to view mode).
- **Out of scope:**
  - Boards, which already use a name dialog.
  - Tickets, which are created inline from a title.
  - Projects, which already work this way.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing Angular router, `FolderedItemService`, `ItemDetailLayoutComponent`, `ConfirmDialogComponent`, Rails pages and diagrams controllers. No new dependencies.

## 2.2 Structure

### Backend
- **`ApplicationController`:**
  - `create_page_params` permits `:title, :content, :folder_id, :project_id`
  - `create_diagram_params` permits `:title, :content, :folder_id, :project_id`
- **`PagesController#create`:** set `content` from the param, sanitised with `Rails::Html::SafeListSanitizer` as `update` does (default `""`). Set `folder_id` when given, validated the same way `update` validates a folder (team and item type). Use the same error as `update` for an invalid folder.
- **`DiagramsController#create`:** the same, with the diagram content stored as `update` stores it.
- **Contributors:** creating with content doesn't add the creator as a contributor (the creator is shown as Owner).
- **Tests** (`pages_controller_test.rb`, `diagrams_controller_test.rb`):
  - creating with content and a folder stores both
  - page HTML is sanitised
  - a folder from another team or item type is rejected
  - `search_text` is filled from the created content

### Frontend
- **Routes:**
  - `${AppRoutes.DOCUMENT_PAGES}/new` → `PageDetailComponent`
  - `${AppRoutes.DIAGRAMS}/new` → `DiagramDetailComponent`

  Both are declared before the `/:id` routes in `app.routes.ts`, with a new `AppRoutes.NEW = 'new'`. The folder is passed as the query param `folder=<id>`.
- **`FolderedListPageComponent.handleCreateItem(parentId)`:** navigates to `[DASHBOARD, itemRoute, NEW]` with `queryParams: {folder: parentId}` (omitted when null). It no longer calls the API.
- **`FolderedItemService.create(teamCode, params)`:** takes `{title, content, projectId, folderId}`. Update its callers and `foldered-item.service.spec.ts`. `moveToFolder` is no longer needed after creating.
- **`FolderedItemDetailComponent`:**
  - `mode` gains `'create'`. When the route `id` is `new`, it doesn't load or connect the editing channel. It sets `draftTitle = ''`, `draftContent = ''`, `draftProjectId = projectFilterService.getSelectedProjectId()`, and `folderId` from the query param.
  - `handleCreate()` calls `create` with the drafts, the draft project and the folder, then `handleGoBack()` without a discard check. On failure it sets `alertMessage`.
  - `isCreating` disables the button.
  - `hasCreateDraftChanges` compares the drafts to their initial values.
  - `handleCancel()` in create mode closes immediately or opens the discard confirm (`showDiscardConfirm`).
  - `handleGoBack()` from X or the backdrop goes through the same check.
- **`ItemDetailLayoutComponent`:**
  - `item` becomes optional (`FolderedItemDetail | null`) for create mode.
  - New inputs: `discardConfirmMessage`, `showDiscardConfirm`, `draftProjectId`, `busy`.
  - New outputs: `createRequested`, `discardConfirmed`, `discardCancelled`, `draftProjectChange`.
  - In `mode === 'create'` the header shows `[Cancel] [Create] [X]`. The sidebar shows only the project picker, bound to `draftProjectId`. The title input and `<ng-content>` editor show as in edit mode.
- **`page-detail.component.html` and `diagram-detail.component.html`:** render the editor for `mode === 'edit' || mode === 'create'`, and wire the new inputs and outputs. Check that `*ngIf="item"` on the layout is relaxed for create mode.
- **Phrases** (in `PHRASES` and every translation file):
  - `CONFIRM_DISCARD_NEW_PAGE` ("Discard this new page?")
  - `CONFIRM_DISCARD_NEW_DIAGRAM` ("Discard this new diagram?")
  - reuse `CREATE` and `CANCEL`

## 2.3 Decisions
1. **Create view:** the full detail popup with Cancel and Create, not a name-only dialog.
2. **Scope:** pages and diagrams only. Tickets keep inline creation.
3. **Cancel with changes:** a confirmation before discarding. An untouched draft closes immediately.
4. **After Create:** close the popup and go back to the list. Staying in view mode was rejected (that's today's behaviour, which the user wants changed).
5. **One create request** carrying content, folder and project, instead of create-then-move. Creating with a `new` route and a `folder` query param. (Implementation choices, not ones the user asked for.)
6. **Create mode sidebar** shows only the project picker, since owner, contributors and dates don't exist yet. (Implementation choice, not one the user asked for. Confirm during review.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Overlaps with other specs:**
- `detail-close-button-placement.spec.md` should land first, since create mode uses its header layout. If it isn't merged, put the X at the far right anyway and stop and ask the user if it is in progress on another branch.
- `item-row-click-and-rename.spec.md` also changes `foldered-list-page.base.ts` and `FolderedItemService`.
- `escape-shortcut.spec.md` builds on this spec's create mode.
- `radius-and-spacing.spec.md` touches `item-detail-layout` CSS.

If any of these is in progress on another branch, stop and ask the user before editing the shared files.

Baseline before starting: run `npm test` in `frontend/` and `bin/rails test` in `backend/`, and note the counts here.

### A. Backend
- [ ] A1. Extend `create_page_params` and `create_diagram_params`, and set content and folder in both `create` actions as in 2.2.
- [ ] A2. Add the controller tests from 2.2. Run `bin/rubocop`.

### B. Data layer
- [ ] B1. Change `FolderedItemService.create` to take `{title, content, projectId, folderId}` and update `foldered-item.service.spec.ts`.

### C. Create mode
- [ ] C1. Add `AppRoutes.NEW` and the two `new` routes before the `:id` routes.
- [ ] C2. Change `FolderedListPageComponent.handleCreateItem` to navigate to create mode. Update `document-pages.component.spec.ts` (no API call, and the right route and query params).
- [ ] C3. Add create mode to `FolderedItemDetailComponent`: initial drafts, `handleCreate`, the discard check, and skipping load and editing presence for `new`.
- [ ] C4. Add create mode to `ItemDetailLayoutComponent` (header, sidebar project picker, discard confirm) and wire it in the page and diagram detail templates.
- [ ] C5. Add the discard phrases to `PHRASES` and every translation file.
- [ ] C6. Add `foldered-item-detail` tests (through `PageDetailComponent` or a small test subclass):
  - create mode makes no request until Create
  - Create sends the drafts and folder, then navigates back
  - a failure keeps the popup open
  - an untouched cancel closes, and a changed cancel asks first

### Z. Wrap-up
- [ ] Z1. Run `bin/rails test`, `bin/rubocop` and `bin/brakeman` in `backend/`, and `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Update `CLAUDE.md` if the shared detail and list classes' description needs to mention create mode.
- [ ] Z3. Manual check in the running app:
  - New page: type a title and content, press Create, and it closes and appears in the list.
  - "+" on a folder: the item lands in that folder.
  - With a project selected in the header: the item gets that project.
  - Cancel when untouched closes, and cancel after typing asks first.
  - Close the browser tab mid-draft: no Untitled item appears.
  - The same for diagrams.
  - Editing an existing page still returns to view mode on Save.
