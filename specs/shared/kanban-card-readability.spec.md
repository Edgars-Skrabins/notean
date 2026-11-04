# Kanban card readability — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

The Kanban tab of a board (`/dashboard/boards/:id/kanban`) shows each column as a 280px lane of ticket cards. A UX critique of 2026-11-04 (Nielsen score 23/40, "recognition rather than recall" 2/4) found that the cards hide the information people scan a board for:

- Titles are cut to one line with an ellipsis, about 16 characters ("Fix login redire…"), so most tickets can't be told apart without opening them.
- The three hover actions (favourite star, Move to backlog, Delete) are `opacity: 0` but still take about 90px of every card, even at rest.
- Priority is not shown on cards at all, although the List tab shows it on every row.
- At 1280px wide the "Add column" button at the end of the lanes is scrolled out of view and nothing tells the user the board scrolls sideways.

This feature makes cards readable at a glance and makes the board's horizontal overflow visible.

- **Users:** every team member who can see the board, while scanning or triaging tickets on the Kanban tab.
- **Usage:**
  1. A card shows the full title, wrapping onto up to three lines. A longer title ends with an ellipsis on the third line; the full title is in the ticket popup.
  2. Under the title the card shows the tags (as today, at most 3 chips plus "+N"), then a meta line with the ticket's priority (coloured dot and priority name), the attachment count (paperclip and number, as today) and the assignees' avatars on the right. The meta line is left out when the ticket has no priority, no attachments and no assignees.
  3. Clicking anywhere on the card except the action buttons opens the ticket popup, as clicking the title does today.
  4. At rest the card shows no action buttons and reserves no space for them. Hovering the card, or moving keyboard focus into it, shows a small action group in the card's top-right corner (Move to backlog, Delete, favourite star), floating over the card on an opaque background. Leaving the card or moving focus out hides it again.
  5. A favourited ticket always shows its filled star in that corner, as today; only then does the title keep room on its right for the star, so the star never covers text at rest.
  6. On touch screens the action group is not shown; tapping a card opens the popup, where the same actions are.
  7. When the lanes are wider than the tab, the side that has more lanes fades out at its edge (right edge at the start, both edges in the middle, left edge at the end). The fade disappears from a side once the user has scrolled all the way to it.
  8. After the user adds a column, the board scrolls to the end so the new column and the "Add column" button are in view.
- **Rules:**
  - Priority, tags, attachments and assignees on the card come from the board already loaded by `BoardPageStateService`; no new requests. Live updates (`tickets_upserted`, `priorities_changed`) refresh the card like the rest of the board.
  - A deleted priority clears from its tickets (existing backend behaviour), so the card then shows no priority.
  - Drag and drop of cards works as today; the action buttons never start a drag.
- **Out of scope:**
  - The column header's hover actions (Rename column, Delete column) and every other hover-only row action: they belong to `row-actions-keyboard-access.spec.md`, which explicitly excludes kanban cards only.
  - Changing what the card actions do, or the confirm dialog on Delete (`trash-undo-without-confirm.spec.md`).
  - Theme token values such as `--color-text-faint` (`theme-contrast.spec.md`).
  - Vertical scrolling of very tall columns (not part of the critique).

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. Uses the existing Angular CDK drag-drop, `app-tag-chips`, `app-avatar-stack`, `app-icon`, `app-icon-button`, `app-favorite-star`, the shared `.priorityDot` class in `styles.css` and the `appTooltip` directive.

## 2.2 Structure

### Card (`frontend/src/app/components/kanban-ticket/`)

- `kanban-ticket.component.ts`: new `@Input() priority: BoardPriority | null = null` (`BoardPriority` from `@models/priority.model`).
- `kanban-ticket.component.html`, new layout:
  ```
  .kanbanTicket                       (position: relative; flex column)
    button.kanbanTicket__main         (title + tags, full width, opens the ticket)
      span.kanbanTicket__title
      app-tag-chips.kanbanTicket__tags
    div.kanbanTicket__meta  *ngIf="priority || ticket.attachmentCount > 0 || ticket.assignees.length"
                            (click) -> opened.emit()
      span.kanbanTicket__priority *ngIf="priority"
        span.priorityDot [attr.data-color]="priority.color"
        span.kanbanTicket__priorityName  {{ priority.name }}
      span.kanbanTicket__attachments (unchanged markup, moved here)
      app-avatar-stack.kanbanTicket__assignees (margin-left: auto)
    div.kanbanTicket__actions          (position: absolute, top-right)
      app-icon-button inbox  (Move to backlog)
      app-icon-button trash  (Delete)
      app-favorite-star      (last, so it sits in the corner)
  ```
- `kanban-ticket.component.css`:
  - `.kanbanTicket`: `position: relative`, `display: flex; flex-direction: column`; keep background, border, radius, `cursor: grab` and the hover border.
  - `.kanbanTicket__title`: multi-line clamp: `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden; overflow-wrap: anywhere;` with a line height around 1.35. Remove `white-space: nowrap` and `text-overflow`.
  - `.kanbanTicket__meta`: flex row, `align-items: center`, `gap: var(--space-2)`, `padding: 0 12px 10px`, `cursor: pointer`, `color: var(--color-text-muted)`, `font-size: var(--font-xs)`. `.kanbanTicket__priority` is a flex row with a 6px gap (as `.listRow__priority`), and `.kanbanTicket__priorityName` ellipsizes on one line with `min-width: 0`.
  - `.kanbanTicket__actions`: `position: absolute; top: 6px; right: 6px; display: flex; gap: 2px; padding: 2px; border-radius: var(--radius-sm)`. Children get `opacity: 0; pointer-events: none; transition: opacity var(--transition-fast)`.
  - Reveal: `.kanbanTicket:hover` and `.kanbanTicket:focus-within` give the children `opacity: 1; pointer-events: auto` and give `.kanbanTicket__actions` an opaque `background: var(--color-card-bg)`, `border: 1px solid var(--color-input-border)` and `box-shadow: var(--shadow-card)`. `.kanbanTicket__actions > .favoriteStar--favorited` keeps `opacity: 1; pointer-events: auto` at rest.
  - Favourited reserve: `.kanbanTicket:has(.favoriteStar--favorited) .kanbanTicket__main { padding-right: 40px; }` (28px star + 6px offset + 6px breathing room).
  - `@media (hover: none)`: `.kanbanTicket__actions { display: none; }`.
  - No hardcoded colours; stay under the 2kB warning if possible and well under the 4kB error.

### Column (`frontend/src/app/components/kanban-column/`)

- `kanban-column.component.ts`: new `@Input() priorities: BoardPriority[] = []` and a method `priorityOf(ticket: TicketSummary): BoardPriority | null` (finds `ticket.priorityId` in `priorities`, `null` when the id is null or unknown).
- `kanban-column.component.html`: pass `[priority]="priorityOf(ticket)"` to `app-kanban-ticket`.

### Tab (`frontend/src/app/pages/dashboard/kanban-tab/`)

- `kanban-tab.component.html`: pass `[priorities]="board.priorities"` to each `app-kanban-column`; add `#scroller` and `(scroll)="updateOverflow()"` to `.kanbanTab`.
- `kanban-tab.component.ts`:
  - `@ViewChild('scroller') scroller?: ElementRef<HTMLElement>` (the element is inside `*ngIf`).
  - Implements `AfterViewChecked` and `OnDestroy`. `ngAfterViewChecked` attaches a `ResizeObserver` to the scroller the first time it exists (the pattern in `chat-message-list.component.ts`), runs a pending scroll to the end (see below), then calls `updateOverflow()`. `ngOnDestroy` disconnects the observer.
  - `updateOverflow()` reads the scroller's `scrollLeft`, `clientWidth` and `scrollWidth`, computes the edges with `scrollEdges` and toggles the classes `kanbanTab--fadeStart` and `kanbanTab--fadeEnd` directly with `classList.toggle`. It writes the DOM directly instead of through template bindings, because the values are read after the view is checked and a binding would raise `ExpressionChangedAfterItHasBeenCheckedError`.
  - `handleCreateColumnConfirmed` sets a private `scrollToEndPending = true` after pushing the new column; `ngAfterViewChecked` then calls `scroller.scrollTo({left: scrollWidth, behavior: 'smooth'})` once and clears the flag (behaviour `'auto'` when `matchMedia('(prefers-reduced-motion: reduce)')` matches).
- `kanban-tab.component.css`: the fade is a mask on the scroll container, driven by two custom properties:
  ```css
  .kanbanTab {
    --kanbanTab-fadeStart: 0px;
    --kanbanTab-fadeEnd: 0px;
    mask-image: linear-gradient(to right, transparent 0, var(--color-text-heading) var(--kanbanTab-fadeStart), var(--color-text-heading) calc(100% - var(--kanbanTab-fadeEnd)), transparent 100%);
  }
  .kanbanTab--fadeStart { --kanbanTab-fadeStart: var(--space-7); }
  .kanbanTab--fadeEnd { --kanbanTab-fadeEnd: var(--space-7); }
  ```
  A mask only uses the alpha channel, so any opaque token works; `--color-text-heading` is used so the file holds no colour literal.

### New helper

- `frontend/src/app/utils/scrollEdges.ts`: `export function scrollEdges(metrics: { scrollLeft: number; clientWidth: number; scrollWidth: number }): { start: boolean; end: boolean }`. `start` is `scrollLeft > 1`, `end` is `scrollLeft + clientWidth < scrollWidth - 1` (1px tolerance for sub-pixel widths and zoom).
- `frontend/src/app/utils/scrollEdges.spec.ts`.

### Docs

- `CLAUDE.md` (Frontend > Services and HTTP, the board paragraph): say that priorities show as a `.priorityDot` "in List rows and on Kanban cards", and that Kanban cards wrap titles to three lines with their actions floating on hover or focus.

### Parallel work

- `row-actions-keyboard-access.spec.md` reveals hover-only actions on focus everywhere except kanban cards. It may change `kanban-column.component.css` (column header actions). This spec only touches `kanban-column.component.ts` and `.html` (the `priorities` input), so keep the column CSS untouched here.
- `trash-undo-without-confirm.spec.md` removes the confirm dialog for ticket and column deletes, which edits `kanban-tab.component.html` and `.ts` (the `app-confirm-dialog` blocks and the `requestDelete*` / `handleConfirmDelete*` handlers). This spec only adds the `priorities` binding, `#scroller`, `(scroll)`, the lifecycle hooks and the scroll flag in `handleCreateColumnConfirmed`; keep those edits away from the delete code to make the merge trivial.
- `ticket-status-control.spec.md` replaces the ticket popup's header Move to backlog / Move to board buttons with a Status dropdown. Either way the popup keeps every action the card hides on touch screens.
- `CLAUDE.md` is edited by several specs; change only the board sentence named above.

## 2.3 Decisions

1. **How titles fit (2026-11-04):** wrap to at most three lines, then ellipsis. Reason: Impeccable operate.md "Scanability … outrank expression" and Nielsen #6 recognition over recall; three lines fit about 90 characters in a 280px lane, which covers almost all real ticket titles while keeping cards a similar height. Rejected: unlimited wrapping (one long title makes a giant card and breaks the board's rhythm, Impeccable layout.md "Rhythm"); two lines (still cuts common titles); a tooltip with the full title (hover-only, invisible to touch and keyboard).
2. **Where actions go (2026-11-04):** an absolutely positioned group in the top-right corner, revealed on `:hover` and `:focus-within`, on an opaque card background with the card shadow, reserving no space at rest. Reason: the critique measured ~90px of a 280px card lost to invisible buttons; overlaying on demand is the known Trello/Linear card pattern (Impeccable operate.md "Standard … patterns", "earned familiarity"); `:focus-within` keeps them reachable by keyboard (WCAG 2.1.1, 2.4.7). Rejected: a "…" menu button on every card (adds a permanent control and an extra click to frequent actions); moving actions to a footer row (adds permanent height to every card).
3. **Favourited star at rest (2026-11-04):** keep it visible as today, put it last in the group so it sits in the corner, and reserve right padding on the title only for favourited cards (`:has(.favoriteStar--favorited)`). Reason: favourite state is information worth seeing at rest (Nielsen #1 visibility of status) and must never cover text (Impeccable craft-floor "Verify … real content"). Rejected: reserving the padding on every card (wastes width on most cards); a separate static star in the meta line (duplicates the control and its state).
4. **Action order (2026-11-04):** Move to backlog, Delete, favourite star. Reason: follows from decision 3 (star in the corner); keyboard order then matches visual order left to right (Impeccable layout.md "Keyboard … order agree with the visual order").
5. **Touch screens (2026-11-04):** hide the action group under `@media (hover: none)`; the card opens the popup, which has Delete, the favourite star and the move control. Reason: hover reveals don't exist on touch, and permanently visible buttons would bring back the wasted space; no action is lost because the popup has them all (Impeccable layout.md "Keep touch targets usable"). Hidden children also get `pointer-events: none`, so a tap on the corner reaches the card. Rejected: always showing actions on touch (cramps the 280px card on phones).
6. **Priority on the card (2026-11-04):** coloured dot plus priority name in the meta line, nothing when the ticket has no priority. Reason: WCAG 1.4.1 (colour must not be the only carrier of meaning), and Nielsen #4 consistency with List rows, which show dot plus name. Rejected: dot only (colour-only meaning, and colours are user-chosen per board); a coloured left border on the card (Impeccable craft-floor bans coloured `border-left` above 1px on cards).
7. **Meta line contents and order (2026-11-04):** priority, attachments, then assignees pushed right; the line is omitted when empty. Reason: reading order goes from triage information to ownership, and assignee avatars on the right edge match the List row and the existing card (Impeccable polish.md "Match neighboring mental models"). Clicking the meta line opens the ticket, like clicking a List row's cells does.
8. **Horizontal overflow affordance (2026-11-04):** fade the edge that has hidden lanes with a CSS mask toggled from the scroll position, and scroll to the end after creating a column. Reason: Nielsen #1 visibility of system status: the board gives no hint that more lanes or "Add column" exist off-screen. Keeping "Add column" at the end of the lanes is the known Trello/Jira position (Impeccable operate.md "Standard navigation patterns"). Rejected: moving "Add column" into a toolbar above the lanes (breaks the familiar end-of-board placement and splits column management); a pinned "Add column" lane at the right edge (permanently takes 280px of an already tight board); custom scrollbars (Impeccable operate.md lists them as reinvented affordances).
9. **How overflow is measured (2026-11-04):** a pure `scrollEdges` helper plus direct `classList` toggling from `ngAfterViewChecked`, `(scroll)` and a `ResizeObserver`. Reason: lanes change without the scroller resizing (board load, add or delete column, live `columns_changed`), and `ngAfterViewChecked` covers all of those; a pure helper keeps the logic testable. Rejected: CSS scroll-driven animations (`animation-timeline: scroll()`): not supported in every browser the app targets.
10. **Fade width (2026-11-04):** `var(--space-7)` (48px). Reason: wide enough to read as "continues" on a 280px lane without hiding a card's content; uses the spacing scale (Impeccable layout.md "Use a documented spacing scale").

### Decisions to double-check

- Decision 5 hides the card action buttons on touch screens; touch users move, delete and favourite tickets from the popup instead. No business logic, data model or permission changes otherwise.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Scroll edge helper
- [ ] A1. Create `frontend/src/app/utils/scrollEdges.ts` with `scrollEdges` as described in Part 2.2, and `scrollEdges.spec.ts` covering: no overflow (both false), at the start of an overflowing row (end only), in the middle (both), at the end (start only), and a sub-pixel difference of under 1px counting as no overflow.

### B. Card layout
- [ ] B1. Add the `priority` input to `kanban-ticket.component.ts` and import `BoardPriority`.
- [ ] B2. Restructure `kanban-ticket.component.html` into title button, meta line and the absolutely positioned action group in the order Move to backlog, Delete, favourite star, as in Part 2.2. The meta line renders only when there is a priority, an attachment or an assignee, and its click emits `opened`.
- [ ] B3. Rewrite `kanban-ticket.component.css` per Part 2.2: three-line clamp, meta line, overlay group revealed on `:hover` and `:focus-within`, favourited star visible at rest with the `:has()` padding reserve, `@media (hover: none)` hiding the group. Only tokens and `color-mix` for colours.
- [ ] B4. Create `frontend/src/app/components/kanban-ticket/kanban-ticket.component.spec.ts` (TestBed with `provideTranslateService()` and a `FavoriteService` spy, as in `list-row.component.spec.ts`, using `ticketSummary` from `testing/boardFixtures`): shows the priority name and a `.priorityDot` with the priority's `data-color` when a priority is given; renders no meta line for a ticket with no priority, attachments or assignees; clicking the meta line emits `opened`; clicking the Delete button emits `deleteTicket` and not `opened`; the action buttons come in the order Move to backlog, Delete, favourite star.

### C. Column and tab wiring
- [ ] C1. Add the `priorities` input and `priorityOf` to `kanban-column.component.ts`, bind `[priority]="priorityOf(ticket)"` in `kanban-column.component.html`, and add tests to `kanban-column.component.spec.ts`: `priorityOf` returns the matching priority, and `null` for a null or unknown `priorityId`.
- [ ] C2. In `kanban-tab.component.html` bind `[priorities]="board.priorities"` on `app-kanban-column`, and add `#scroller` and `(scroll)="updateOverflow()"` on `.kanbanTab`.
- [ ] C3. In `kanban-tab.component.ts` add the `scroller` view child, `AfterViewChecked` / `OnDestroy`, the lazily attached `ResizeObserver`, `updateOverflow()` using `scrollEdges` and `classList.toggle('kanbanTab--fadeStart' | 'kanbanTab--fadeEnd', …)`, and the `scrollToEndPending` flag set in `handleCreateColumnConfirmed` after a successful create (smooth scroll unless reduced motion is preferred).
- [ ] C4. Add the mask rules and the two modifier classes to `kanban-tab.component.css` as in Part 2.2.
- [ ] C5. Extend `kanban-tab.component.spec.ts`: after a successful column create the tab asks the scroller to scroll to its end once (stub `scroller` with a fake element whose `scrollTo` is a spy and call `ngAfterViewChecked` twice; expect one call); a failed create does not scroll; `updateOverflow` sets `kanbanTab--fadeEnd` but not `kanbanTab--fadeStart` on a fake element scrolled to the start of an overflowing row.

### D. Docs
- [ ] D1. Update the board paragraph in `CLAUDE.md` (Frontend > Services and HTTP) as described in Part 2.2 "Docs".

### Z. Wrap-up
- [ ] Z1. Full test runs (`npm test` in `frontend/`, `bin/rails test` in `backend/` to confirm nothing else moved), `npm run build` (check the component style budgets), and run `/Users/edgarsskrabins/.claude/skills/impeccable/scripts/impeccable detect --json frontend/src/app/components/kanban-ticket frontend/src/app/pages/dashboard/kanban-tab` once and fix real findings.
- [ ] Z2. Manual check in the running app at 1280px and 1440px, in Purple haze dark and Paper light: a board with long titles shows them on up to three lines; a ticket with a priority shows dot and name; hovering a card and tabbing into it both show the action group over the card with no reserved gap at rest; a favourited card shows its star without covering the title; dragging cards between columns still works; with more columns than fit, the right edge fades, scrolling to the end removes that fade and shows a left fade; adding a column scrolls it into view. At 375px wide (device emulation with touch) cards show no action buttons and a tap opens the popup.
