# Row actions keyboard and touch access — Spec

**Type:** bug fix
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

Some rows and headers hide their action buttons until the mouse hovers them. Keyboard users can Tab onto those buttons, but the buttons stay invisible (opacity 0), so focus lands on an invisible "Rename" or "Delete". Touch users have no hover at all, so they never find the actions. In chat it is worse: the message toolbar is `display: none` until hover, so the buttons are not in the tab order at all and keyboard users cannot react to, edit or delete a message.

**What goes wrong today (reproduce):**
1. Open Pages, press Tab until focus reaches a row's Rename button: the focus ring sits on an empty spot, the buttons stay at opacity 0 (`.itemTree__rowActions > * { opacity: 0 }`, revealed only by `.itemTree__row:hover`).
2. Open a board's Kanban tab and Tab to a column header's Rename / Delete: same, invisible (`.kanbanColumn__actions` revealed only by `.kanbanColumn__header:hover`).
3. Open a chat channel and try to reach a message's reactions, Edit or Delete with the keyboard: impossible (`.chatMessage__actions { display: none }`; its `:focus-within` rule can never match because a `display: none` element cannot hold focus).
4. Open any of these on a phone or tablet (no hover): the actions never appear.

**What should happen:** hidden actions show whenever the mouse is over the row **or focus is anywhere inside it**, and are always reachable on touch screens.

**Audit of hover-only reveals in `frontend/src` (2026-11-04, excluding `kanban-ticket`, which `kanban-card-readability` owns):**

| File | Rule | Problem | Action in this spec |
|---|---|---|---|
| `app/components/item-tree/item-tree.component.css` (lines ~69-77) | `.itemTree__rowActions > *` opacity 0, shown on `.itemTree__row:hover` | invisible on keyboard focus, missing on touch | fix |
| `app/components/kanban-column/kanban-column.component.css` (lines ~47-57) | `.kanbanColumn__actions` opacity 0, shown on `.kanbanColumn__header:hover` | invisible on keyboard focus, missing on touch | fix |
| `app/components/chat-message/chat-message.component.css` (lines ~61-79) | `.chatMessage__actions` `display: none`, shown on `.chatMessage:hover`, `--active` or its own `:focus-within` | not keyboard reachable at all, missing on touch | fix |
| `app/components/diagram-comment-layer/diagram-comment-layer.component.css` (lines ~57-70) | `.commentLayer__card` `display: none`, shown on pin hover or marker `:focus-visible` | a read-only preview, already shown on keyboard focus; tapping the marker opens the full thread | no change |
| `app/components/flowchart-editor/flowchart-editor.component.css` (lines ~75-81) | X6 port circles `visibility: hidden`, shown on node hover | a pointer-only drag affordance for drawing connectors, not an action button | out of scope |

The other components named in the critique were checked and keep their actions always visible, so they need nothing: `sidebar-boards`, `sidebar-chat`, `priority-list`, `tag-list`, `comment-item`, `attachment-row` / `attachment-list`, `template-list`, `list-row`, `activity-row`, `project-item-row`, `favorites-list`, `favorites-grid`. The remaining `opacity: 0` / `visibility` hits (`dropdown`, `tooltip`, `toast`, `auth-card`, `dashboard-header`, `global-search`) are enter/leave keyframes, and `checkbox`'s is its visually hidden native input.

- **Users:** every team member using a keyboard, a screen reader or a touch screen on the Pages and Diagrams item trees, the Kanban column headers and chat messages.
- **Usage:**
  1. **Item tree (Pages, Diagrams, project detail lists that use `ItemTreeComponent`):** with a mouse nothing changes. When focus is anywhere in a row (its title button, chevron or any action), the row's actions fade in, so Tab from a title onto Rename shows the button under the focus ring. On a device without hover (`@media (hover: none)`) the actions are always visible.
  2. **Kanban column headers:** the same rules for the Rename column / Delete column buttons.
  3. **Chat messages:**
     - Each message is one Tab stop (`tabindex="0"`, `role="article"`, labelled with the author's nickname and the exact time). Focusing it, by keyboard or by tapping it on a touch screen, shows its toolbar (recent reactions, More reactions, Edit, Delete) exactly where it shows on hover today.
     - From a focused message, Tab moves into its toolbar buttons and then on to the next message. While a message is neither hovered, focused nor has its emoji picker open, its toolbar is hidden and `inert`, so it adds no Tab stops and cannot be clicked by accident.
     - Moving focus out of the message (Tab past it, clicking elsewhere) hides the toolbar again, except while its emoji picker overlay is open (today's `chatMessage--active` behaviour stays).
     - Mouse use is unchanged.
- **Rules:** purely a presentation and focus fix. No permissions, data or API change. What actions a row offers stays as today.
- **Out of scope:**
  - Kanban cards (`kanban-ticket`): `kanban-card-readability` owns them.
  - A global focus ring style: buttons keep the browser's default focus outline; only visibility of the hidden actions changes here.
  - Arrow-key (roving) navigation between chat messages and a skip-to-composer shortcut: a larger keyboard model for chat, worth its own spec.
  - Bigger touch targets for the 28px icon buttons: `responsive-dashboard-shell` covers mobile sizing.
  - Diagram ports and the comment pin preview (see the audit table).

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing stack only: component CSS, Angular host listeners and attribute bindings, the native `inert` attribute (supported by every browser the app targets). No new dependencies.

## 2.2 Structure

**`item-tree.component.css`** (changed): the reveal selector gains `.itemTree__row:focus-within .itemTree__rowActions > *`. A new `@media (hover: none)` block sets `.itemTree__rowActions > *` to `opacity: 1`. The buttons keep `opacity` hiding (never `display` or `visibility`), so they stay in the tab order and can be focused.

**`kanban-column.component.css`** (changed): the reveal selector gains `.kanbanColumn__header:focus-within .kanbanColumn__actions`, plus the same `@media (hover: none)` block making `.kanbanColumn__actions` `opacity: 1`.

**`chat-message.component.ts`** (changed):
- New state `isHovered = false` and `hasFocus = false`, set by `@HostListener('mouseenter' | 'mouseleave')` and `@HostListener('focusin')` / `@HostListener('focusout', ['$event'])` (focusout only clears `hasFocus` when `event.relatedTarget` is outside the host element, read through an injected `ElementRef`).
- New getter `actionsRevealed`: `isHovered || hasFocus || isEmojiOpen`.
- New getter `accessibleLabel`: `${message.author.nickname}, ${exactTime}`.

**`chat-message.component.html`** (changed):
- The root `.chatMessage` gets `tabindex="0"`, `role="article"`, `[attr.aria-label]="accessibleLabel"` and `[class.chatMessage--revealed]="actionsRevealed"` (replacing `[class.chatMessage--active]="isEmojiOpen"`, which `actionsRevealed` now includes).
- The `.chatMessage__actions` div gets `[attr.inert]="actionsRevealed ? null : ''"`.

**`chat-message.component.css`** (changed):
- `.chatMessage__actions` drops `display: none` for `display: flex` with `opacity: 0; pointer-events: none; transition: opacity var(--transition-fast)`.
- `.chatMessage--revealed .chatMessage__actions` sets `opacity: 1; pointer-events: auto`. The old `:hover`, `--active` and `:focus-within` reveal selectors are removed (the class covers them). `pointer-events: none` matters because the toolbar sits 14px above the message and would otherwise catch clicks meant for the message above.
- The `.chatMessage:hover, .chatMessage--active` background rule becomes `.chatMessage--revealed`.
- `.chatMessage:focus-visible` keeps the browser outline; `.chatMessage:focus:not(:focus-visible) { outline: none; }` hides the ring a tap or click would otherwise draw.

**`chat-message.component.spec.ts`** (new; the component has no spec yet): builds the component with `TestBed` and stub services, as the other component specs do.

**Parallel work:**
- `kanban-card-readability` changes `kanban-ticket` and `kanban-tab` with the same hover/focus-within reveal idea. This spec only touches `kanban-column`; if that spec also edits `kanban-column.component.css`, keep both sets of rules.
- `responsive-dashboard-shell` may adjust touch target sizes; this spec only changes visibility.
- `theme-contrast` replaces `transition: all` usages; the transitions added here name `opacity` explicitly.

## 2.3 Decisions
1. **How hidden actions show on keyboard focus (2026-11-04):** reveal on `:focus-within` of the row or header, keep hiding by `opacity` so the buttons stay focusable. Reason: WCAG 2.4.7 (Focus Visible) and 2.1.1 (Keyboard); Impeccable operate.md "Every interactive component has: default, hover, focus…"; Nielsen #4 (same reveal on hover and focus). Rejected: always showing every action (adds clutter on dense lists; Impeccable distill.md "progressive disclosure"), `:focus-visible` on each button only (the other buttons of the row would stay invisible while you Tab through them).
2. **Touch (2026-11-04):** under `@media (hover: none)` the item tree and Kanban column actions are always visible. Reason: Impeccable harden.md "All functionality accessible"; layout.md "Keep touch targets usable"; touch has no hover to reveal them. Rejected: a long-press menu (invented affordance, Impeccable operate.md "Reinventing standard affordances"), a "More" menu per row (extra tap for every action, bigger change).
3. **Chat toolbar reach (2026-11-04):** the message is the Tab stop and its toolbar is `inert` until the message is hovered, focused or has its emoji picker open. Reason: making the up-to-nine toolbar buttons of every message tabbable would put hundreds of Tab stops between the user and the composer (Impeccable harden.md "Logical tab order"); one stop per message plus the toolbar on demand mirrors common chat apps. `role="article"` with an author-and-time label tells screen readers what was focused. Rejected: only removing `display: none` (every toolbar button becomes a Tab stop), roving tabindex with arrow keys (better, but a bigger chat keyboard model; recorded as out of scope).
4. **Chat on touch (2026-11-04):** tapping a message focuses it (it is focusable), which reveals its toolbar; tapping elsewhere hides it. Reason: gives touch a discoverable path without showing a toolbar on every message (Impeccable quieter/distill: avoid repeated chrome). Rejected: always-visible chat toolbars on touch (one floating toolbar per message is noise).
5. **No change to the diagram comment preview or diagram ports (2026-11-04):** the preview already shows on marker `:focus-visible` and is not an action; ports are a pointer drag affordance. Reason: the spec covers hidden *actions*.
6. **Tests (2026-11-04):** the chat reveal logic (`actionsRevealed`, `inert`, focus-out inside vs outside) is unit tested; the pure CSS selector changes in the item tree and Kanban column are verified manually in Z2, because asserting computed `:focus-within` styles in Karma depends on the browser window having focus and is flaky.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Item tree and Kanban column
- [x] A1. In `frontend/src/app/components/item-tree/item-tree.component.css`, add `.itemTree__row:focus-within .itemTree__rowActions > *` to the existing reveal rule (next to `.itemTree__row:hover .itemTree__rowActions > *`), and add a `@media (hover: none)` block that sets `.itemTree__rowActions > *` to `opacity: 1`. Done when tabbing from a row title onto its actions shows them, and the mobile preset in the browser pane shows them without hover.
- [x] A2. In `frontend/src/app/components/kanban-column/kanban-column.component.css`, add `.kanbanColumn__header:focus-within .kanbanColumn__actions` to the reveal rule and the same `@media (hover: none)` block for `.kanbanColumn__actions`. Done when tabbing into a column header shows Rename / Delete.

### B. Chat messages
- [x] B1. In `frontend/src/app/components/chat-message/chat-message.component.ts`, inject `ElementRef`, add `isHovered` and `hasFocus` with `@HostListener`s for `mouseenter`, `mouseleave`, `focusin` and `focusout` (clear `hasFocus` only when `relatedTarget` is not inside the host), and add the `actionsRevealed` and `accessibleLabel` getters described in Part 2.2.
- [x] B2. In `chat-message.component.html`, give the root `.chatMessage` `tabindex="0"`, `role="article"`, `[attr.aria-label]="accessibleLabel"` and `[class.chatMessage--revealed]="actionsRevealed"` (removing `[class.chatMessage--active]`), and give `.chatMessage__actions` `[attr.inert]="actionsRevealed ? null : ''"`.
- [x] B3. In `chat-message.component.css`, replace the `display: none` hiding with `opacity: 0; pointer-events: none` plus an `opacity` transition, reveal it under `.chatMessage--revealed`, move the hover background to `.chatMessage--revealed`, remove the old `:hover` / `--active` / `:focus-within` reveal selectors, and add `.chatMessage:focus:not(:focus-visible) { outline: none; }`. Keep the file under the 4kB style budget.
- [x] B4. Create `frontend/src/app/components/chat-message/chat-message.component.spec.ts` (TestBed, stub `ChatService`, `TeamService`, `ToastService`, `RecentReactionsService` with a `recent` list, `TranslateModule.forRoot()` or `NO_ERRORS_SCHEMA` as other specs do) with tests: the toolbar has `inert` and no `chatMessage--revealed` by default; `mouseenter` reveals it and removes `inert`; `focusin` reveals it; a `focusout` whose `relatedTarget` is inside the message keeps it revealed while one going outside hides it; it stays revealed while `isEmojiOpen` is true; the root has `tabindex="0"`, `role="article"` and an `aria-label` with the nickname.
- [x] B5. Run `npm test` in `frontend/` and fix any spec broken by the class rename (search the specs for `chatMessage--active` and `chatMessage__actions`).

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test` and `npm run build` in `frontend/`; the backend is untouched, but run `bin/rails test` to confirm the baseline).
- [ ] Z2. Manual check in the running app: on Pages, Tab from the search through several rows and confirm the focused row shows its actions; on a board's Kanban tab, Tab into a column header; in a chat channel, Tab onto a message, see its toolbar, Tab into a reaction and press Enter, Tab on and see the toolbar move to the next message; switch the browser pane to the mobile preset, reload, and confirm item tree and column actions are visible and tapping a chat message shows its toolbar.
