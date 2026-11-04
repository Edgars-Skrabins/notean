# List tab polish — Spec

**Type:** bug fix
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

The List tab of a board (`/dashboard/boards/:id/list`, `ListTabComponent` with `ListRowComponent` rows) shows the tickets grouped by status, with checkboxes for bulk actions. The UX critique of 2026-11-04 found two defects:

1. **Rows jump when selecting.** The bulk-action bar (`app-ticket-selection-bar`) is inserted between the toolbar and the first group as soon as one ticket is checked. That pushes every row down by about 44px, so the row under the cursor moves away right after the click, and a second click lands on the wrong ticket. Unchecking the last ticket moves everything back up.
   - Reproduce: open a board's List tab with a few tickets, check the first ticket's checkbox, watch the rows shift down; uncheck it, they shift up.
   - Expected: checking or unchecking never moves any row.
2. **Status repeated in every row.** Each row shows its status as a text label (`.listRow__status`), but the rows already sit under a group header with that same status ("Backlog", "In progress"…). The repeated label adds noise to every row and takes up to 120px of width from the title.
   - Reproduce: open any List tab; every row in the "Backlog" group says "Backlog".
   - Expected: the status is shown once, in the group header.

- **Users:** board members triaging and bulk-editing tickets in the List tab.
- **Usage:**
  1. Checking a ticket (or a group's checkbox) shows the selection bar floating at the bottom of the visible area of the list, with the same contents as today (count, Set status, Assign, Unassign, Delete, Clear selection). No row moves.
  2. While the list is scrolled, the bar stays pinned near the bottom of the screen above the rows. When the list is shorter than the screen, the bar sits right below the last group.
  3. When the user scrolls to the end, the last rows and the "Load more" / "Create ticket" controls are fully visible above the bar (the bar never permanently covers content).
  4. Clearing the selection removes the bar; again no row moves.
  5. Rows show title, tags, priority, created date, assignees and actions. The status label is gone; the group header names the status.
- **Rules:** no change to what selection, filtering or bulk actions do. Selection still clears on search, filter or group reload, as today.
- **Out of scope:**
  - Announcing the selection count to screen readers (no live regions are added here; `announced-status-messages.spec.md` owns the shared status and toast semantics).
  - The confirm dialog for bulk delete (`trash-undo-without-confirm.spec.md`) and dialog semantics (`dialog-accessibility.spec.md`).
  - Row action visibility on hover or focus (`row-actions-keyboard-access.spec.md`; List row actions are already always visible).
  - Keyboard shortcuts for selection (not part of the critique).

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. CSS `position: sticky` inside the existing scroll container (`.dashboardShell__content`, `overflow-y: auto`, in `dashboard.component.css`).

## 2.2 Structure

### Selection bar position

- `frontend/src/app/pages/dashboard/list-tab/list-tab.component.html`: move the `<app-ticket-selection-bar *ngIf="selectedTickets.length" …>` block from between `.listTab__toolbar` and the groups to the end of `.listTab`, after the last `section.listTab__group`, and give it `class="listTab__selectionBar"`. Bindings and outputs stay the same.
- `frontend/src/app/pages/dashboard/list-tab/list-tab.component.css`: add
  ```css
  .listTab__selectionBar {
    position: sticky;
    bottom: var(--space-4);
    z-index: 1;
  }
  ```
  and give `.listTab` `padding-bottom: calc(var(--space-6) + var(--space-4))` (see decision 6).
  Because the bar is the last item in the flex column, appearing only adds height below the last group; the rows above never move. `position: sticky` keeps it at the bottom of the viewport while `.listTab` is scrolled, and its in-flow height means the end of the list scrolls fully above it.
- `frontend/src/app/components/ticket-selection-bar/ticket-selection-bar.component.css`: the bar now floats over rows, so it needs an opaque surface and elevation: change `background` from `var(--color-input-bg-focus)` (translucent in several themes) to `var(--color-card-bg)` and add `box-shadow: var(--shadow-card)`. Keep the `var(--color-input-border-focus)` border, which marks it as the active selection context.
- The bar's menus (`app-menu-button`) already use `DROPDOWN_POSITIONS`, which fall back to opening above the trigger, so they still fit at the bottom of the screen. Verify this in the manual check.

### Status label in rows

- `frontend/src/app/components/list-row/list-row.component.ts`: remove the `statusTitle` input.
- `list-row.component.html`: remove `<span class="listRow__status">{{ statusTitle }}</span>`.
- `list-row.component.css`: remove `.listRow__status` from the shared `.listRow__status, .listRow__date` rule and delete the `.listRow__status` block. Give `.listRow__date` `min-width: 8em`, `text-align: end` and `font-variant-numeric: tabular-nums` so the date column lines up from row to row now that the status cell no longer pads it (English "Nov 4, 2026" and "Nov 14, 2026" otherwise differ in width).
- `list-tab.component.html`: remove the `[statusTitle]="…"` binding on `app-list-row`.
- `list-row.component.spec.ts`: drop `setInput('statusTitle', …)`, and in "opens the ticket from the title and from the cells around it" click `.listRow__date` instead of `.listRow__status`.

### Docs

- `CLAUDE.md` (Frontend > Services and HTTP, the List tab sentence): say the `TicketSelectionBarComponent` floats at the bottom of the list (sticky) while tickets are selected.

### Parallel work

- `trash-undo-without-confirm.spec.md` may remove or change the `app-confirm-dialog` blocks for single and bulk delete in `list-tab.component.html` and their handlers in `list-tab.component.ts`. This spec only moves the `app-ticket-selection-bar` block and removes one binding on `app-list-row`; keep away from the dialog blocks.
- `dialog-accessibility.spec.md` changes `move-to-board-dialog`, used at the bottom of `list-tab.component.html`; that block is untouched here.
- `announced-status-messages.spec.md` restyles the `.authStatus` line at the top of `list-tab.component.html` and may move toasts. If it moves toasts to the bottom of the screen, check in the manual test that a toast doesn't cover the selection bar (toasts sit at `z-index: 70` in a fixed container, the bar at `z-index: 1` inside the content).
- `quiet-dashboard-background.spec.md` changes the decorative waves behind dashboard content; the bar's opaque `--color-card-bg` keeps it readable either way.
- `CLAUDE.md` is edited by several specs; change only the List tab sentence named above.

## 2.3 Decisions

1. **Where the selection bar goes (2026-11-04):** a sticky bar at the bottom of the list, placed after the groups in the DOM. Reason: the bug is a layout shift under the cursor (Impeccable polish.md triage priority 1 "misleading state", layout.md "Extremes: … sticky elements"); a bottom floating bulk-action bar is the known pattern in Linear, Notion and Gmail (Impeccable operate.md "earned familiarity"); it stays visible while the user scrolls a long list to check more tickets. Rejected: swapping the bar into the toolbar's slot at the top (no shift, but the bar is off-screen once the user has scrolled down to select, and it hides search while selecting); always reserving an empty slot above the rows (permanent dead space, Nielsen #8 minimalist design); `position: fixed` (would have to be positioned around the sidebar by hand and escapes the list's width).
2. **DOM and focus order (2026-11-04):** the bar comes after the groups, so keyboard users reach it after the rows. Reason: Impeccable layout.md "Keyboard, touch, and assistive-technology order agree with the visual order": the bar is visually at the bottom. This is the cost of decision 1 and was accepted over the off-screen problem of the top slot.
3. **Bar surface (2026-11-04):** opaque `--color-card-bg` with `--shadow-card`. Reason: the bar now overlaps rows, and `--color-input-bg-focus` is translucent in dark themes, which would let row text show through (Impeccable craft-floor "Contrast"); elevation here clarifies that it floats above the list (Impeccable layout.md "Use depth only when it clarifies state or hierarchy").
4. **Status label in rows (2026-11-04):** remove it from every row, including search and filter results. Reason: the List tab always groups by status, even while searching or filtering, so the header already names it (Nielsen #8 aesthetic and minimalist design; Impeccable operate.md "Scanability"). Rejected: keeping it only while searching (results are still grouped, so it would still repeat).
5. **Date column alignment (2026-11-04):** `min-width: 8em`, right-aligned tabular numerals. Reason: with the status cell gone, variable-width dates shift the assignee and action columns between rows; Impeccable craft-floor "Browser surfaces: … the numerals in tabular data" and polish.md "fix optical as well as mathematical alignment". `em` keeps the width relative to the font size; localized long forms (for example Russian "14 нояб. 2026 г.") still fit because it is a minimum, not a fixed width.

6. **End-of-list space for the sticky bar (2026-11-04, found in the manual check):** `.listTab` gets `padding-bottom: calc(var(--space-6) + var(--space-4))`. Reason: `.boardPage` is `height: 100%` (Kanban scrolls inside it), so the List tab overflows it and the shell's `--space-6` bottom padding never follows the list; Chrome also measures the sticky `bottom` inset inside that padding, so at the end of the list the bar covered "Create ticket" by 48px, breaking usage point 3. The padding restores the shell's end space plus the bar's inset, so at the end the bar sits in flow below the last control with the usual gap. Rejected: changing `.boardPage` to `min-height` (outside this spec and Kanban relies on the fixed height). Known edge case: when a list taller than the screen is scrolled to its very end, clearing the selection removes the bar's height from the page, so the browser clamps the scroll position and the rows shift down by that much; anywhere else in the list nothing moves. Avoiding it would mean permanently reserving the bar's space, which decision 1 rejected.

7. **375px check (2026-11-04):** at 375px the dashboard sidebar still takes most of the width on master (the shell's small-screen layout belongs to `responsive-shell`), so the List tab is too narrow to judge there. The bar still stays sticky, clears the last control at the end of the list and causes no horizontal page scroll; its controls wrap.

### Decisions to double-check

- None: no business logic, data model or permission changes. Decision 2 (the bar moves later in keyboard order) is the one trade-off worth a look.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Selection bar without layout shift
- [x] A1. In `list-tab.component.html` move the `app-ticket-selection-bar` block to the end of `.listTab` (after the groups) with `class="listTab__selectionBar"`, and add the `.listTab__selectionBar` sticky rule to `list-tab.component.css`.
- [x] A2. In `ticket-selection-bar.component.css` switch the background to `var(--color-card-bg)` and add `box-shadow: var(--shadow-card)`.
- [x] A3. Add a DOM test to `list-tab.component.spec.ts` (set up with `TestBed`, `provideTranslateService()` and the same `BoardPageStateService` fixture and service spies the existing tests use; if the file only builds the component with `new`, add a separate `describe` block for this DOM test): after selecting a ticket, `app-ticket-selection-bar` is rendered as the last element child of `.listTab`, after every `.listTab__group`, so nothing is inserted above the rows.

### B. Status label removed from rows
- [x] B1. Remove the `statusTitle` input, the `.listRow__status` span and its CSS from `list-row.component.*`, add the date column alignment rules, and remove the `[statusTitle]` binding from `list-tab.component.html`.
- [x] B2. Update `list-row.component.spec.ts` as described in Part 2.2, and add a test that a rendered row contains no `.listRow__status` element and shows the formatted created date in `.listRow__date`.

### C. Docs
- [x] C1. Update the List tab sentence in `CLAUDE.md` as described in Part 2.2.

### Z. Wrap-up
- [x] Z1. Full test runs (`npm test` in `frontend/`, `bin/rails test` in `backend/`) and `npm run build`; run `/Users/edgarsskrabins/.claude/skills/impeccable/scripts/impeccable detect --json frontend/src/app/pages/dashboard/list-tab frontend/src/app/components/list-row frontend/src/app/components/ticket-selection-bar` once and fix real findings.
- [x] Z2. Manual check in the running app at 1280px in Purple haze dark and Paper light, on a board with 20+ tickets in the Backlog: check a row's checkbox, the row stays under the cursor and the bar appears at the bottom of the screen; scroll, the bar stays pinned and opaque over the rows; scroll to the end, "Load more" and "Create ticket" are visible above the bar; open each bar menu near the bottom of the screen, it opens upward and fits; clear the selection, nothing moves. Every row shows no status label, and dates, assignees and actions line up from row to row. Repeat at 375px.
