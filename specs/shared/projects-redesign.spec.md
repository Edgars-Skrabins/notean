# Projects redesign — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

The projects list shows cards in a grid, and opening a project shows its settings form inline. This redesign turns the list into full-width rows. The project page becomes an overview of what's in the project, with the settings moved into a popup.

- **Users:** every team member on the Projects screen. Managing a project is limited as today (project owner and team owner, `canManage`).
- **Usage:**
  - **Projects list (`/dashboard/projects`):**
    - Each project is one full-width row, the same height as today's cards. It shows the name, the description on one line (cut off with an ellipsis), the owner's avatar and nickname, and the member count, laid out horizontally.
    - Clicking anywhere on the row opens the project.
    - The "New project" button, empty state and creation dialog are unchanged.
  - **Project page (`/dashboard/projects/:id`),** shown inside the dashboard content area (not a popup):
    - The back link to Projects, then the **project name** as the title and the **description** under it (hidden when empty).
    - **Items:** a heading, then subsections **Pages**, **Diagrams** and **Boards**. Each lists the project's items as rows (type icon, title, creator nickname, last updated), newest updated first. Subsections without items are hidden. When the project has no items at all, an empty message shows: "No items in this project yet".
    - Clicking a page or diagram opens its detail popup, and clicking a board opens its Kanban tab.
    - **Right panel:** a narrow vertical panel like the contributors panel in page popups:
      - A **Settings** button, only for users who can manage the project. It opens the settings popup.
      - **Members:** each member's avatar and nickname. The owner is listed first with an "Owner" label.
  - **Settings popup:**
    - Everything the project page shows today: the project form (name, description, owner, members), Save, and the danger zone with Delete project.
    - Save keeps today's rules (disabled without changes, name-taken error under the field, success toast). After saving, the popup stays open and the page behind updates its title, description and members.
    - Closing with unsaved changes asks for confirmation (today's "leave with unsaved changes" message).
    - Delete works as today and returns to the projects list.
- **Rules:**
  - Item visibility is unchanged: only what the user can already see in the project.
  - Only `canManage` users see the Settings button. The API already refuses updates from others.
- **Out of scope:**
  - Tickets (reached through boards).
  - Folders inside the project view (items are listed flat per type).
  - Item counts on list rows.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing Angular, the existing list endpoints with `project_id` (via `projectQuery`), `ProjectFormComponent`, `ConfirmDialogComponent` and `DeleteProjectDialogComponent`. No new dependencies or backend changes.

## 2.2 Structure

**Projects list (`pages/dashboard/projects/`):**
- Replace `.projects__grid` and `.projects__card` with a vertical list of `.projects__row` buttons (full width, horizontal layout, current card height).

**Project page (`pages/dashboard/project-detail/`):**
- Load the project as today. Also load its items with the existing list calls, each filtered to this project:
  - `PageService.list(teamCode, projectId)`
  - `DiagramService.list(teamCode, projectId)`
  - the board list call used by `BoardListService` (check `board.service.ts` for the method that accepts a project id)

  Use `Promise.all` and sort each type by `updatedAt` descending in the component.
- Template: header (title, description), items section, and a right panel (`.projectDetail__sidebar`, styled like `.itemDetail__sidebar`) with the Settings button and the member list.
- Rows: a small presentational component `components/project-item-row/` (`ProjectItemRowComponent`, `app-project-item-row`) with inputs `icon: IconName`, `title`, `meta` and an `opened` output. The project page uses it three times.
- Navigation:
  - pages → `[DASHBOARD, DOCUMENT_PAGES, id]`
  - diagrams → `[DASHBOARD, DIAGRAMS, id]`
  - boards → `boardRoute(id)`

**Settings popup:** a new component `components/project-settings-dialog/` (`ProjectSettingsDialogComponent`), styled like the other dialogs (overlay, backdrop, window).
- The form state, `hasUnsavedChanges`, save, delete and the leave confirmation move from `ProjectDetailComponent` into this dialog.
- Inputs: `project` and `members`.
- Outputs: `saved` (the updated `ProjectDetail`), `deleted` and `closed`.
- The project page keeps `HasUnsavedChanges` for the route guard by asking the open dialog (or returns `true` when it is closed).

**Phrases** (in `PHRASES` and every translation file):
- `PROJECT_ITEMS` ("Items")
- `NO_PROJECT_ITEMS` ("No items in this project yet")
- `PROJECT_SETTINGS` ("Settings")
- `MEMBERS` (if not already present)
- reuse `DOCUMENT_PAGES`, `DIAGRAMS`, `BOARDS` and `OWNER`

## 2.3 Decisions
1. **Items grouping:** grouped by type (Pages, Diagrams, Boards), newest updated first, empty groups hidden. One mixed list was rejected.
2. **Page content:** title, description and items. No tickets.
3. **List rows** show the same data as today's cards. Item counts were rejected for now.
4. **Settings visibility:** only for users who can manage the project (`canManage`: project owner or team owner), matching "if you can edit the project, you can see the settings".
5. **Data loading** reuses the existing list endpoints with `project_id`, so no new endpoint is needed. (Implementation choice, not one the user asked for.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Overlaps with other specs:**
- `escape-shortcut.spec.md` adds Esc handling to the project page and needs the settings popup from this spec. It should start after this one.
- `feature-flags.spec.md` hides the item groups of disabled features. If it is merged first, respect its flags here.
- `radius-and-spacing.spec.md` touches `projects` and `project-detail` CSS.

If any of these is in progress on another branch, stop and ask the user before editing the shared files.

Baseline before starting: run `npm test` in `frontend/` and note the count here.

### A. Projects list
- [ ] A1. Turn the project cards into full-width rows in `projects.component.html` and `.css`.

### B. Settings popup
- [ ] B1. Create `ProjectSettingsDialogComponent` with the form, save, delete and the unsaved-changes confirmation moved from `ProjectDetailComponent`.
- [ ] B2. Add `project-settings-dialog.component.spec.ts`:
  - Save is disabled without changes
  - a name-taken error shows under the field
  - `saved` emits the updated project
  - closing with changes asks first

### C. Project page
- [ ] C1. Create `ProjectItemRowComponent`.
- [ ] C2. Rebuild `project-detail`: title, description, items grouped by type from the three list calls, the right panel with Settings (only when `canManage`) and the members (owner first), and the empty state.
- [ ] C3. Keep the route guard working through the dialog's unsaved state.
- [ ] C4. Add the phrases to `PHRASES` and every translation file.
- [ ] C5. Add or extend `project-detail.component.spec.ts`:
  - items are grouped and sorted
  - empty groups are hidden
  - Settings shows only when `canManage`
  - a saved project updates the header
  - each item type navigates to the right route

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Update `CLAUDE.md` if the projects description needs it.
- [ ] Z3. Manual check in the running app:
  - The projects list shows rows.
  - Open a project with pages, diagrams and a board: grouped rows open the right places.
  - As the project owner: Settings opens, save changes the title behind it, and delete returns to the list.
  - As a regular member: no Settings button.
  - Unsaved settings and navigating away asks first.
