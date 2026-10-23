# Header and type scale — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

Sizes across the app don't follow a hierarchy. Font sizes are scattered rem values, the header controls have different heights, and list rows are tall with almost no gap between them. This spec introduces a fixed type scale, makes the header one consistent row, makes item rows more compact, and lets global search start from the first letter.

- **Users:** everyone in the dashboard.
- **Usage, what changes visibly:**
  - **Brand:** the "Notean" title in the header is 24px.
  - **Header controls:** project selector, global search input, language selector, avatar and the menu (burger) button are all 28px tall, vertically centred in the 64px header.
  - **Type scale.** Every font size in the app maps to one of these:

    | Size | Used for |
    |---|---|
    | 12px | labels, meta text, sidebar section labels, captions, badges |
    | 13px | small UI: dropdowns, menus, buttons, inputs, tabs, toasts |
    | 14px | body text, row titles, form text |
    | 16px | section headings inside a screen or window |
    | 20px | screen and window titles (page title in a detail popup, board title, "Settings" and similar) |
    | 24px | the Notean brand only |

  - **Item rows:** page, diagram and folder rows in the item tree are 36px tall (today items are 44px and folders 48px), with a 6px gap between rows (today 2px). Backlog (later List) rows use the same height and gap. Nested folder indentation stays at 20px per level.
  - **Global search:** results appear from the first character typed (today 2). The 250ms debounce stays.
- **Rules:** the backend search endpoint accepts 1-character queries. An empty or whitespace-only query is still rejected with `QUERY_TOO_SHORT`.
- **Out of scope:**
  - Corner radii and window paddings (`radius-and-spacing.spec.md`, which lands first).
  - Mobile-specific layouts.

# Part 2 — Technical details

## 2.1 Tools and libraries
CSS custom properties, plus one constant on each side for search. No new dependencies.

## 2.2 Structure

**Type tokens (`frontend/src/styles.css`):** add `--font-xs: 12px`, `--font-sm: 13px`, `--font-md: 14px`, `--font-lg: 16px`, `--font-xl: 20px`, `--font-brand: 24px`. Replace every `font-size` in `styles.css` and component CSS with the matching token (grep `font-size`). Mapping guide for today's values:
- `0.7rem` and `0.75rem`, and `0.8rem` used for meta → `--font-xs`
- `0.85rem` → `--font-sm`
- `0.9rem` and `0.95rem` → `--font-md`
- `1rem` to `1.1rem` headings → `--font-lg`
- `1.2rem` to `1.6rem` titles → `--font-xl`
- the brand → `--font-brand`

Anything that doesn't fit gets the nearest token, with a note in the PR description.

**Header (`components/dashboard-header/dashboard-header.component.css`):**
- `.dashboardHeader__brand` uses `font-size: var(--font-brand)`.
- A `--control-height-sm: 28px` token in `styles.css`, used for the header controls.
- `dropdown.component.css`: add a compact variant. A `size` input on `DropdownComponent` (`'md' | 'sm'`, default `'md'`) sets the class `dropdown__trigger--sm` with `height: 28px`, a smaller vertical padding and `box-sizing: border-box`. `app-language-switcher` passes `size="sm"`.
- `project-selector.component.css`: trigger height 28px.
- `global-search.component.css`: input height 28px.
- `avatar` in the header: 28px (check `avatar.component` for a size input; if there is none, scope the size under `.dashboardHeader__trigger`).
- The menu button is already `app-icon-button` size 28.

**Item rows (`components/item-tree/item-tree.component.css`):**
- `.itemTree` `gap: 6px`.
- `.itemTree__row` `min-height: 36px`, and the same for `.itemTree__row--folder` and `--item`.
- Reduce item row vertical padding so the row is 36px (for example `padding: 0 12px` with the row main filling the height). Root drop zone active height 36px.
- **Backlog rows:** `backlog-row.component.css` and the list gap in `backlog-tab.component.css` follow the same height and gap.

**Search minimum:**
- `frontend/src/app/components/global-search/global-search.component.ts`: `MIN_QUERY_LENGTH = 1`.
- `backend/app/controllers/search_controller.rb`: `MIN_QUERY_LENGTH = 1`.
- Update `search_controller_test.rb` (a 1-character query now succeeds, and an empty or whitespace query still gives 422) and `global-search.component.spec.ts` (a request is sent at 1 character, and none for whitespace only).
- Update the global search description in `CLAUDE.md` if it mentions the minimum.

## 2.3 Decisions
1. **Type scale:** 12/13/14/16/20/24 as tokens. The coarser 12/14/16/18/24 was rejected.
2. **Rows:** 36px with 6px gaps, for folders, items and backlog rows. 40px with 8px was rejected.
3. **1-letter search** stays in this spec rather than its own.
4. **Header:** all header controls are 28px, not only the language selector.
5. **Compact dropdown** is a `size` input on the shared dropdown, not a language-switcher-only override. (Implementation choice, not one the user asked for.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Prerequisite:** `radius-and-spacing.spec.md` is merged into `master`. If it isn't, stop and ask the user.

**Overlaps with other specs:** `language-flag-alignment-fix` (dropdown), `item-row-click-and-rename` (item tree, backlog row) and `board-list-tab` (backlog rows become List rows) touch the same files. If any is in progress on another branch, stop and ask the user before editing those files. If `board-list-tab` is merged first, apply the row sizing to the List rows instead of the backlog rows.

Baseline before starting: run `npm test` in `frontend/` and `bin/rails test` in `backend/`, and note the counts here.

### A. Type scale
- [ ] A1. Add the `--font-*` tokens to `styles.css` and replace the font sizes in `styles.css`.
- [ ] A2. Replace the font sizes in every component CSS file with tokens, following the mapping in 2.2.

### B. Header
- [ ] B1. Set the brand to 24px and add the `--control-height-sm` token.
- [ ] B2. Add the dropdown `size` input and the `sm` variant, use it in the language switcher, and add a test that `size="sm"` sets the trigger class.
- [ ] B3. Make the project selector, search input and header avatar 28px tall, and check the alignment of the whole header.

### C. Rows
- [ ] C1. Item tree rows are 36px with a 6px gap, for folders and items, including the drag preview and the root drop zone.
- [ ] C2. Backlog rows get the same height and gap.

### D. Search from 1 letter
- [ ] D1. Set the backend minimum to 1 and update `search_controller_test.rb`.
- [ ] D2. Set the frontend minimum to 1 and update `global-search.component.spec.ts`.

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`, and `bin/rails test`, `bin/rubocop` and `bin/brakeman` in `backend/`.
- [ ] Z2. Update `CLAUDE.md` if it mentions the search minimum.
- [ ] Z3. Manual check in the running app:
  - The header controls line up at 28px and the brand is 24px.
  - Typing one letter in search shows results.
  - Pages and diagrams lists with nested folders: rows are 36px with visible gaps, and drag and drop still works.
  - The backlog list looks the same.
  - Titles, headings, body and meta text follow the scale on Home, a page popup, a board and Settings.
