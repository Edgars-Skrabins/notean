# Radius and spacing consistency — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

The UI looks too round and loosely spaced, which reads as casual and mobile-like. This spec moves the app to a two-tier corner radius and a tighter, hierarchical spacing scale. It also tones down the sidebar's "Create board +" hover.

- **Users:** everyone. This is purely visual.
- **Usage, what changes visibly:**
  - **Corner radius, two tiers:**
    - **8px for controls:** buttons, icon buttons, inputs, textareas, dropdown triggers, list rows (item tree, backlog, sidebar), chips, tabs, the editing banner, the global search input (no longer a pill) and the page back button (no longer a pill).
    - **12px for surfaces:** detail popups (page, diagram, ticket), dialogs, auth cards, the Settings, Profile and Manage team cards, dropdown and search panels, cards (projects, favorites), the item sidebar, toasts, the rich-text and diagram editor frames.
    - **Unchanged:** circles stay circles (avatars, checkbox). Tiny decorative radii (pie-chart legend swatches, overview bars, the search highlight) stay as they are.
  - **Outer padding of windows:** at most 24px.
    - Detail popups: padding goes from 32px to 24px, and the gap to the screen edge from 24px to 16px.
    - Ticket popup: from 32px to 24px.
    - Auth cards: from 56/48/80px to 24px (the narrow-screen variant also uses 24px).
    - Settings, Profile and Manage team cards: from 56/48/64px to 24px.
    - Dialogs: already 24px, unchanged.
  - **Spacing hierarchy (4/8/12/16/24):**
    - 24px: outer padding of a window or card.
    - 16 to 24px: between sections inside a window. 24px between major blocks (for example main column and sidebar), 16px between sections in a column.
    - 8 to 12px: between related controls in a group (action buttons, label and field, rows of a form). 8px within a button group, 12px between fields.
    - 4 to 8px: inside a control (icon to text, label to value).
    - The 32px and larger tokens are only for page-level spacing such as empty states and the dashboard content padding. Inside windows, the existing 32px gaps (`--space-6`, for example `.itemDetail__body`) drop to 24px.
  - **"Create board +" in the sidebar:** no background highlight on hover. On hover only the text and icon get slightly brighter (muted text colour to heading colour). Board rows keep their current hover and active background.
- **Rules:** no behaviour changes.
- **Out of scope:**
  - Font sizes, header control heights and row heights. These are covered by `header-and-type-scale.spec.md`, which builds on this spec.
  - Colours and shadows.

# Part 2 — Technical details

## 2.1 Tools and libraries
CSS custom properties in `frontend/src/styles.css` and component CSS. No new dependencies.

## 2.2 Structure

**Tokens (`styles.css`):**
- `--radius-sm: 8px` (unchanged), `--radius-md: 12px` (was 14px).
- Remove `--radius-lg` (24px) and switch every use to `--radius-md`. Current users: `auth-card`, `item-detail-layout`, `ticket-detail`, `settings`, `profile`, `manage-team`.
- `--radius-pill` stays in the token list, but its two current uses (`global-search` input and `.pageBackButton`) switch to `--radius-sm`. Delete the token if nothing uses it afterwards.

**Controls that use `--radius-md` today and must switch to `--radius-sm`:**
- `button.component.css` (`.button`)
- `item-detail-layout` (`.itemDetail__titleInput`, `.itemDetail__editingBanner`)
- `item-tree` row radius
- `rich-text-editor` toolbar controls
- dialog inputs (`create-named-item-dialog`, `delete-project-dialog`)
- `styles.css` form inputs (the `border-radius: var(--radius-md)` rules near lines 121 and 145, which are the shared input and field styles)

Go through every `border-radius` in `frontend/src` (grep) and assign each to a tier using the lists in Part 1. Surfaces keep or get `--radius-md`.

**Padding:**
- `item-detail-layout.component.css`: `.itemDetail` gets `inset: var(--space-4)` and `padding: var(--space-5)`, and `.itemDetail__body` gets `gap: var(--space-5)`.
- `ticket-detail.component.css`: outer `padding: var(--space-5)`.
- `auth-card.component.css`: `padding: var(--space-5)` in both the default and the media-query rule. Check the decorative wave at the bottom still fits (it currently relies on the 80px bottom padding, so give it its own space if needed).
- `settings`, `profile` and `manage-team` component CSS: `padding: var(--space-5)`, including their media-query variants.
- Inner gaps: replace window-internal `--space-6` (32px) gaps with `--space-5`, and check each window against the hierarchy in Part 1.

**Sidebar:** `sidebar-boards.component.css`: add a `.sidebarBoards__create:hover` rule with `background: none` and `color: var(--color-text-heading)`, overriding the shared `.sidebarBoards__row:hover`. The default colour of `.sidebarBoards__create` stays the muted text colour.

**Budgets:** component styles must stay under the 4kB error budget. `npm run build` checks this.

## 2.3 Decisions
1. **Two tiers:** 8px for controls, 12px for surfaces, `--radius-lg` removed. Changing only buttons and windows was rejected as inconsistent.
2. **Global search:** loses its pill shape and uses 8px like other inputs.
3. **Spacing:** the 4/8/12/16/24 hierarchy in Part 1, with windows capped at 24px outer padding. Only capping outer padding was rejected.
4. **Relation to `header-and-type-scale.spec.md`:** kept separate. This spec lands first, and that one builds on it.
5. **Page back button** (`.pageBackButton`) also loses its pill shape, to remove the last pill. (Implementation choice following decision 1, not one the user asked for.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Overlaps with other specs:** this spec touches CSS across most components. Several specs also edit those components' CSS: `language-flag-alignment-fix` (dropdown), `detail-close-button-placement` (item-detail-layout, ticket-detail), `header-and-type-scale` (header, item tree, dropdown, search), `item-row-click-and-rename` (item tree, backlog row), `tooltips` (icon button) and `board-list-tab` (backlog). Before starting, check `git branch -r` and open pull requests. If any of these is in progress, stop and ask the user which goes first. `header-and-type-scale` must not start until this spec is merged.

Baseline before starting: run `npm test` in `frontend/` and note the count here.

### A. Tokens
- [ ] A1. Set `--radius-md` to 12px, switch `--radius-lg` users to `--radius-md`, remove `--radius-lg`, and switch the pill users to `--radius-sm` (removing `--radius-pill` if unused).

### B. Radius per component
- [ ] B1. Switch controls from `--radius-md` to `--radius-sm`: `button`, the shared inputs in `styles.css`, the `item-detail-layout` title input and banner, `item-tree`, the `rich-text-editor` toolbar, and dialog inputs.
- [ ] B2. Go through the remaining `border-radius` declarations (grep `frontend/src`) and make sure each matches its tier from Part 1. List anything ambiguous in the PR description.

### C. Padding and spacing
- [ ] C1. Detail popups: `item-detail-layout` inset, padding and body gap. `ticket-detail` padding.
- [ ] C2. Auth card padding (default and narrow), keeping the wave decoration intact.
- [ ] C3. Settings, Profile and Manage team card padding (default and narrow).
- [ ] C4. Review window-internal gaps against the hierarchy and replace 32px gaps with 24px.

### D. Sidebar
- [ ] D1. The "Create board +" hover: no background, only a brighter text and icon colour.

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/` (watch the component style budgets).
- [ ] Z2. Manual check in the running app:
  - login and register pages
  - dashboard home, pages list, an opened page (view and edit) and a diagram
  - a ticket popup, every dialog (new folder, new board, new project, delete confirms, move to board)
  - Settings, Profile and Manage team
  - the "Create board +" hover

  Buttons and inputs are 8px, windows 12px, no window has more than 24px outer padding, and nothing is clipped or cramped at 375px width.
