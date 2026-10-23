# Item row click area and inline rename — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

Two problems with list rows:

1. Only the middle of a row is clickable. The row's padding isn't part of the button, so clicking near the edges does nothing.
2. Page and diagram rows show a pencil icon in front of the title. It looks like a rename button but is just decoration, so clicking it opens the item. There is no way to rename an item from the list.

- **Users:** everyone working in the Pages, Diagrams and board backlog lists.
- **Usage:**
  - **Whole row clickable:** clicking anywhere on a row, padding included, does the row's main action:
    - page or diagram row: opens the item's popup
    - folder row: expands or collapses the folder
    - backlog row: opens the ticket popup

    The row's action buttons (favorite, rename, new, delete, chevron) still do only their own action and don't also trigger the row. Hover styling covers the whole row.
  - **Type icon:** page rows show the `page` icon and diagram rows the `diagram` icon, the same icons the sidebar and search use, instead of the pencil.
  - **Inline rename:** page and diagram rows get a pencil "Rename" button in their hover actions, before favorite and delete, the same as folders have. Clicking it turns the title into an input with the current title selected:
    - Enter or blur saves.
    - Escape cancels.
    - An empty title cancels without saving.
    - On success the row, any favorite of it, and the sidebar favorites show the new title.
    - On failure the old title is kept and the list's alert shows the error.
- **Rules:**
  - Renaming saves the title only. The content is untouched.
  - Renaming counts as an edit: the user is recorded as a contributor and `updated_at` changes, as with any save today.
  - Renaming is available to everyone who can see the item, the same as editing.
- **Out of scope:**
  - Renaming tickets inline in the backlog (tickets are renamed in their popup).
  - Renaming while searching works the same as without searching, so it is not a special case.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing Angular, CDK drag-drop and the `PATCH` page and diagram update endpoints. No new dependencies or backend changes. `update` already accepts a title on its own.

## 2.2 Structure

**Click area (`components/item-tree/`):**
- Move the row padding from `.itemTree__row--item` onto `.itemTree__rowMain` so the button fills the row (`flex: 1`, `align-self: stretch`, horizontal and vertical padding inside the button).
- Do the same for folder rows: the folder `rowMain` button fills everything between the chevron slot and the actions.
- Indentation (`paddingLeft` by depth) stays on the row. Keep the CDK drag behaviour: a drag that starts on the row must still drag, and a plain click still opens.
- **Backlog rows** (`components/backlog-row/`): the same fix, with `.backlogRow__main` filling the row and the avatars and actions staying separate.

**Type icon:**
- Add `@Input({required: true}) itemIcon!: IconName` to `ItemTreeComponent` and use it for the item row icon.
- `document-pages.component.html` passes `'page'` and `diagrams.component.html` passes `'diagram'`.

**Rename:**
- `ItemTreeComponent`:
  - `renamingItemId` and an item rename draft, mirroring the folder rename: `startRenameItem`, `commitRenameItem` and `cancelRenameItem`.
  - A `renameItem` output: `EventEmitter<{ itemId: number; title: string }>`.
  - A new `edit` `app-icon-button` with the `RENAME_ITEM` tooltip in the item row actions.
- `FolderedItemService.rename(teamCode, id, title)` sends `{ title }` only, through `apiRequest`, mapping like `save`.
- `FolderedListPageComponent.handleRenameItem({itemId, title})` calls `rename`, replaces the item in `items` via `toTreeItem`, and calls `favoriteService.renameItem(this.itemType, id, title)`.
- Wire `(renameItem)` in the pages and diagrams list templates.

**Phrases:** `RENAME_ITEM` ("Rename") in `PHRASES` and every translation file.

## 2.3 Decisions
1. **Rename:** add an inline rename action like folders have, and replace the misleading pencil with the type icon. Only swapping the icon was rejected.
2. **Click area** applies to item tree rows (items and folders) and backlog rows.
3. **Rename saves the title only** through a new `rename` service method. Reusing `save` was rejected because it would overwrite the content with nothing. (Implementation choice, not one the user asked for.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Overlaps with other specs:**
- `header-and-type-scale.spec.md` changes item tree and backlog row sizing.
- `radius-and-spacing.spec.md` changes their radius.
- `create-on-confirm.spec.md` changes `foldered-list-page.base.ts`.
- `board-list-tab.spec.md` replaces backlog rows with List rows. If it is merged first, apply the click-area fix to the List row instead. If it is in progress, stop and ask the user.

If any of these is in progress on another branch, stop and ask the user before editing the shared files.

Baseline before starting: run `npm test` in `frontend/` and note the count here.

### A. Click area
- [ ] A1. Item tree item and folder rows: the main button fills the row, and the actions and chevron stay independent. Check that dragging still works.
- [ ] A2. Backlog row: the main button fills the row.
- [ ] A3. Add or extend `item-tree.component.spec.ts` (create it if missing): clicking an action button doesn't emit `openItem`, and clicking the row main emits it.

### B. Type icon
- [ ] B1. Add the `itemIcon` input and pass `page` and `diagram` from the two list pages.

### C. Rename
- [ ] C1. Add `FolderedItemService.rename` and a test in `foldered-item.service.spec.ts` that it sends only `title`.
- [ ] C2. Add the item rename UI and output to `ItemTreeComponent`, and the `RENAME_ITEM` phrase in every translation file.
- [ ] C3. Add `handleRenameItem` to `FolderedListPageComponent` and wire it in both list templates. Extend `document-pages.component.spec.ts`: a successful rename updates the row and calls `favoriteService.renameItem`, and a failure sets the alert and keeps the old title.
- [ ] C4. Item tree tests: Enter commits, Escape and an empty title cancel.

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Manual check in the running app:
  - Click the far left and right padding of page, diagram, folder and backlog rows: each opens or toggles.
  - Action buttons don't open the row.
  - Rename a page and a diagram (Enter, blur, Escape, empty), with a favorited one updating in the sidebar.
  - Drag and drop into folders still works.
