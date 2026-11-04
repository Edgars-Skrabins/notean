# Global search polish — Spec

**Type:** bug fix
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

The header's global search (`GlobalSearchComponent`) works with a mouse but falls short in three ways:

1. **Screen readers can't use it as a search box with suggestions.** The input has `aria-expanded` but no `role="combobox"`, no `aria-controls` and no `aria-activedescendant`. The results panel is a stack of `<button>`s with no listbox semantics, so arrowing through results announces nothing, and the result count is never announced. The "Include all projects" button sits in a CDK overlay at the end of `<body>`, so the keyboard can't reach it, and tabbing out of the input leaves the panel open.
2. **The `/` shortcut is invisible.** Pressing `/` anywhere focuses search, but nothing on screen says so.
3. **"No results found." is a dead end.** It doesn't repeat the query, doesn't say that only the selected project was searched, and offers no next step.

**Reproduce (master f15abdf):** select a project in the header, type a word that only matches items in another project, and you get "No results found." with the include-all button unreachable by keyboard. With VoiceOver or NVDA, type any word and press ↓: nothing is announced.

**Expected:** search behaves as a standard ARIA 1.2 combobox with a listbox popup. The `/` shortcut is shown in the field. An empty result names the query and the scope, and offers "Search all projects" when a project narrowed it.

- **Users:** every team member, keyboard and screen-reader users in particular.
- **Usage:**
  1. Unfocused and empty, the search field shows a small `/` key hint at its right edge. The hint hides on focus, while there's text, and on touch-only devices (`(hover: none)`).
  2. Typing opens the panel as today. Screen readers hear the field as a combobox ("Search everything, combo box, collapsed/expanded"). After each search finishes, a polite status announces "Showing 7 results", "Showing 1 result" or the no-results sentence.
  3. ↑/↓ move through the results, each section's *Show more*, and the project-scope row (below). The highlighted row is announced (`aria-activedescendant`) while focus stays in the field. Enter opens the result, loads more, or widens the scope, as it does today. Esc closes as today.
  4. **Project scope row:** when a project is selected in the header, the panel's last row reads **Search all projects** with "Now searching in 'Marketing'" under it. It replaces today's footer text and button. It can be reached with the arrow keys and Enter, or clicked. Picking it runs the same search across all projects (as `handleIncludeAllProjects` does today), and the row disappears until the panel closes. Closing resets the scope, as today.
  5. **No results:**
     - No project selected: "Nothing matches 'roadmap q3'", then "Try fewer or different words."
     - A project selected: "Nothing in 'Marketing' matches 'roadmap q3'". The **Search all projects** row is right under it and is pre-highlighted, so Enter widens the search at once.
     - After widening, still nothing: the no-project message.
  6. Tabbing out of the field, or focus otherwise leaving it, closes the panel. Clicking a row doesn't move focus out of the field first, so clicks keep working.
  7. While loading, the pulse bar shows as today, but it doesn't animate under `prefers-reduced-motion: reduce`.
- **Rules:** search requests, debounce, the minimum query length, project filtering, result routes and *Show more* paging are unchanged. The only change in requests is that "Search all projects" can now be triggered from the keyboard.
- **Out of scope:**
  - The toast covering the search field (`announced-status-messages` owns toast position).
  - Header layout at small widths (`responsive-dashboard-shell`).
  - The error state's wording ("Search failed"). It's unchanged here.
  - Empty states of the list screens' own search fields (`empty-states-guidance`).
  - Search ranking, snippets or backend search.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing stack: Angular, CDK Overlay, ngx-translate. No new dependencies. The pattern follows WAI-ARIA APG "Combobox with listbox popup" (ARIA 1.2) and "Listbox with grouped options".

## 2.2 Structure
All changes are in `frontend/src/app/components/global-search/` plus phrases and translations.

### `global-search.component.html`
- Wrapper `.globalSearch` (`position: relative`) holds the input and `<kbd class="globalSearch__shortcut" aria-hidden="true" *ngIf="showShortcutHint">/</kbd>`.
- Input attributes: `role="combobox"`, `aria-autocomplete="list"`, `[attr.aria-expanded]="isOpen"`, `[attr.aria-controls]="isOpen ? LISTBOX_ID : null"`, `[attr.aria-activedescendant]="activeOptionId"`, `aria-keyshortcuts="/"`, the existing `aria-label`, plus `(blur)="handleBlur()"`. `(focus)` also sets `isFocused`.
- A visually hidden `<div class="globalSearch__status" role="status" aria-live="polite">{{ statusText | translate: statusParams }}</div>` next to the input, outside the overlay so it stays mounted.
- Overlay panel root: `(mousedown)="$event.preventDefault()"`, so clicking inside never blurs the input. Inside it:
  - `.globalSearch__loading` (unchanged), the error message (unchanged), and the no-results block: `<p class="globalSearch__message">` with `SEARCH_NO_MATCHES` or `SEARCH_NO_MATCHES_IN_PROJECT` (`{query, project}`) and, without a project, `SEARCH_NO_MATCHES_HINT`.
  - `<div role="listbox" [id]="LISTBOX_ID" [attr.aria-label]="PHRASES.SEARCH_RESULTS | translate">` containing:
    - per visible section, `<div role="group" [attr.aria-labelledby]="headingId(section)">` with `<div role="presentation" class="globalSearch__heading capsLabel" [id]="headingId(section)">` (replaces the `<h3>`, since a listbox may only own groups and options), then one `<div role="option" class="globalSearch__row" [id]="optionId(i)" [attr.aria-selected]="isActive(...)" (click)="...">` per result, and the *Show more* option with `[attr.aria-disabled]` while loading;
    - when `selectedProjectName` is set, a last `<div role="option" class="globalSearch__row globalSearch__scope">` with the title `SEARCH_ALL_PROJECTS` and meta line `SEARCH_IN_PROJECT` (`{project}`), clicking `handleIncludeAllProjects()`.
  - The old `.globalSearch__footer` and `.globalSearch__includeAll` button go away.
- Option rows are `div`s, not buttons. They aren't tab stops in a combobox; the input keeps focus.

### `global-search.component.ts`
- `export const LISTBOX_ID = 'globalSearchListbox'` and an option id prefix; `optionId(index)` and `headingId(section)` helpers; `activeOptionId` getter (`null` when `activeIndex < 0` or the panel is closed).
- `NavItem` gains a third shape `{ scope: true }`. `navItems()` appends it when `selectedProjectName` is set. `handleKeydown` Enter on it calls `handleIncludeAllProjects()`. `isActive` covers it.
- After a search result arrives with no visible sections while a project scopes it, set `activeIndex` to the scope row's index (pre-highlight). Otherwise reset to `-1`, as today.
- `statusText` / `statusParams` are set when a search or *Show more* finishes: `SEARCH_RESULTS_SHOWN` / `SEARCH_RESULTS_SHOWN_ONE` with the loaded result count, or the no-results key with its params. They're cleared when the panel closes.
- `isFocused` and `showShortcutHint` (`!isFocused && !query`). `handleBlur()` sets `isFocused = false` and calls `close()`.
- `handleOutsideClick` stays for clicks elsewhere while the input still has focus.

### `global-search.component.css`
- `.globalSearch { position: relative }`; input `padding-right` leaves room for the hint.
- `.globalSearch__shortcut`: absolutely positioned at the right, vertically centred, `--font-xs`, `--color-text-muted`, a 1px `--color-input-border` border, `--radius-sm`, `pointer-events: none`. Hidden in `@media (hover: none)`.
- `.globalSearch__status`: the standard visually-hidden recipe (1px clip, `position: absolute`, no overflow), local to this component.
- `.globalSearch__scope`: the old footer look moved onto the row (top border `--color-input-border`, `margin-top: var(--space-2)`), title in `--color-primary-light`, meta in `--font-xs` muted.
- `.globalSearch__message` gets `overflow-wrap: anywhere` so long queries wrap.
- `@media (prefers-reduced-motion: reduce) { .globalSearch__loading { animation: none; } }`.
- Remove the `.globalSearch__footer` and `.globalSearch__includeAll` rules. Keep the file under the 4 kB error budget.

### Phrases and translations
In `config/phrases.ts` and every file in `frontend/public/assets/translations/` (en, lv, et, lt, ru, sv, fi, de, da, fr, es), next to the existing `SEARCH_*` keys:
- New: `SEARCH_NO_MATCHES` ("Nothing matches '{{query}}'"), `SEARCH_NO_MATCHES_IN_PROJECT` ("Nothing in '{{project}}' matches '{{query}}'"), `SEARCH_NO_MATCHES_HINT` ("Try fewer or different words."), `SEARCH_ALL_PROJECTS` ("Search all projects"), `SEARCH_RESULTS` ("Search results"), `SEARCH_RESULTS_SHOWN` ("Showing {{count}} results"), `SEARCH_RESULTS_SHOWN_ONE` ("Showing 1 result").
- Changed text: `SEARCH_IN_PROJECT` becomes "Now searching in '{{project}}'".
- Removed: `SEARCH_INCLUDE_ALL_PROJECTS` (only global search uses it; grep first). `NO_SEARCH_RESULTS` stops being used here but is still used by list screens. Remove it only if a grep on your rebased branch finds no use (see Parallel work).

### Parallel work
- `empty-states-guidance` replaces `NO_SEARCH_RESULTS` on the Pages, Diagrams, Projects, Trash and Templates screens. Neither spec edits the other's files. Whichever branch is second to merge removes the key if a grep shows it's unused.
- `responsive-dashboard-shell` changes the header layout around `app-global-search` (`dashboard-header`). This spec doesn't touch the header files. The shortcut hint already hides on touch devices.
- `announced-status-messages` adds live regions for toasts and auth errors. This spec's status region is local to the component and needs no shared class.
- `accessible-control-names` covers other search inputs (Pages/Diagrams), not this one.

## 2.3 Decisions
1. **ARIA 1.2 combobox with a listbox popup and `aria-activedescendant`; focus stays in the input.** Reason: WCAG 4.1.2 Name, Role, Value, and the WAI-ARIA APG combobox pattern. Impeccable operate.md: "Standard navigation patterns… command palettes" and native expectations over invention. Rejected: moving DOM focus into the panel (breaks typing to refine; the overlay sits at the end of `<body>`, so tab order would be wrong).
2. **Results become `role="option"` `div`s in `role="group"`s labelled by their section heading.** Reason: a listbox may only own options and groups (ARIA 1.2 required owned elements), so `<button>` rows and `<h3>` headings inside it are invalid. The heading's visual style is kept.
3. **"Search all projects" becomes a navigable option row, replacing the footer button.** Reason: WCAG 2.1.1 Keyboard. The footer button in the portalled overlay couldn't be reached. Merging the scope text into the row says the idea once (Impeccable clarify.md: "Say each idea once"). Rejected: a separate keyboard shortcut for widening (undiscoverable).
4. **No results names the query and the scope, and pre-highlights "Search all projects" when a project narrowed it.** Reason: onboard.md, "No results: suggest different query, clear filters". clarify.md: "Explain the state and provide the next useful action". Pre-highlighting makes the likely next step a single Enter (Nielsen #7 efficiency).
5. **Result counts are announced through a polite status region.** Reason: WCAG 4.1.3 Status Messages. "Showing N results" counts only what's loaded, so it never claims a total the client doesn't know (clarify.md: "never invent").
6. **The `/` shortcut is shown as a `<kbd>` hint inside the field, hidden on focus, with text and on touch devices; the input carries `aria-keyshortcuts="/"`.** Reason: onboard.md, "Keyboard shortcut hints (⌘K shown on search box)". Nielsen #6 recognition over recall. Rejected: putting it in the placeholder (placeholders are examples, not labels, per clarify.md, and it would disappear for screen readers once typing starts).
7. **The panel closes when the input loses focus; clicks inside the panel don't blur it (`mousedown` preventDefault).** Reason: APG combobox expectations, and Tab otherwise leaves a stale panel over the page (harden.md, focus management).
8. **The loading pulse respects `prefers-reduced-motion`.** Reason: WCAG 2.3.3, and Impeccable operate.md: motion conveys state only.
9. **(2026-11-04, during implementation) A failed search or *Show more* is announced through the same status region with the existing `SEARCH_FAILED` text.** Reason: WCAG 4.1.3 Status Messages covers errors too; the wording itself stays unchanged (out of scope).
10. **(2026-11-04) Count announcements in lv, lt, et, fi and ru use a "Results shown: {{count}}" form**, since the spec has only a one/many pair and those languages have more plural forms; the form reads correctly for any number.
11. **(2026-11-04) While a search is loading, the arrow keys reach only the scope row**, since the stale results are hidden then; highlighting invisible rows would announce options that aren't on screen.
12. **(2026-11-04) The stylesheet ends at about 2.14 kB, over the 2 kB warning budget and well under the 4 kB error budget the spec targets.** The button resets the `div` rows no longer need were removed; splitting the component for 140 bytes would add structure for no user benefit.

### Decisions to double-check
None. This changes accessibility and copy only, with no business-logic, data or permission change.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Phrases
- [x] A1. Add the new keys and the changed `SEARCH_IN_PROJECT` text to `config/phrases.ts` and all 11 translation files, next to the existing `SEARCH_*` keys.

### B. Combobox and listbox semantics
- [x] B1. Template: combobox attributes on the input, the listbox/group/option structure with ids, `aria-selected`, `aria-disabled` on *Show more* while loading, and `(mousedown)` preventDefault on the panel. In the `.ts`, add `LISTBOX_ID`, `optionId`, `headingId` and `activeOptionId`.
- [x] B2. Add `handleBlur()` closing the panel and `isFocused` tracking.
- [x] B3. Update `global-search.component.spec.ts`: the input has `role="combobox"` and `aria-controls` points at the rendered listbox only while open; `aria-activedescendant` follows ↓/↑ and is cleared on close; each result row is `role="option"` inside a `role="group"` labelled by its heading; blur closes the panel; the existing keyboard and routing tests still pass with the `div` rows.

### C. Project scope row and no-results state
- [x] C1. Add the `{ scope: true }` nav item, the scope option row, Enter and click handling, and the pre-highlight when a project-scoped search is empty. Remove the footer markup and CSS.
- [x] C2. Add the no-results messages with `{query, project}` and the hint.
- [x] C3. Specs: the scope row appears only with a selected project and is reachable with ↓ and Enter (the next request has no project id); an empty scoped search shows the in-project message and pre-highlights the row; an empty unscoped search shows the query message and hint; the scope row disappears after widening and comes back after close.

### D. Status, shortcut hint and motion
- [x] D1. Add the visually hidden status region with `statusText` / `statusParams` (count, one-result and no-results variants), cleared on close. Specs for each variant, plus an update after *Show more*.
- [x] D2. Add the `<kbd>` shortcut hint, `showShortcutHint`, `aria-keyshortcuts="/"` and its CSS (hidden under `hover: none`). Specs: shown when empty and unfocused, hidden on focus and with text.
- [x] D3. Add the reduced-motion rule and `overflow-wrap` on messages. Check the stylesheet is under the 4 kB error budget (`npm run build`).

### E. Cleanup and docs
- [x] E1. Remove `SEARCH_INCLUDE_ALL_PROJECTS` from `phrases.ts` and every translation file after grepping that it's unused. Remove `NO_SEARCH_RESULTS` only if a grep shows no use left.
- [x] E2. Update the `GlobalSearchComponent` bullet in `CLAUDE.md`: it's an ARIA combobox with a listbox of grouped options (focus stays in the input, `aria-activedescendant`), shows a `/` hint, announces result counts, and offers "Search all projects" as the last option when a project is selected.

### Z. Wrap-up
- [x] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test` and `npm run build` in `frontend/`).
  - 2026-11-04: frontend 995 specs passing (980 baseline + 15 new); the build passes with one budget warning (decision 12). The backend is untouched.
- [ ] Z2. Manual check in the running app: see the `/` hint, press `/`, type a query, arrow through results and *Show more*, and open one with Enter. Select a project, search for something that only exists elsewhere, and press Enter to widen the search. Tab out and check the panel closes. Repeat with VoiceOver: the combobox role, the highlighted options and the result count are announced. Check light and dark mode, and that the hint is gone at 375 px with touch emulation.
  - Not done yet (2026-11-04): the app's dev-server limit for this folder was used up by the parallel sessions, so the browser and VoiceOver check is left for the PR review.
