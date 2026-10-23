# Styled tooltips — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

Icon-only actions (favorite, delete, move to board, rename and so on) only have the browser's native `title` tooltip. It appears late, looks out of place and is easy to miss, so in practice the actions feel like they have no tooltips. Every icon-only control gets a styled tooltip that appears quickly.

- **Users:** everyone using a mouse or keyboard.
- **Usage:**
  - **Showing:** hovering an icon-only control for about 300ms shows a small dark label with the action name, centred above the control. It shows below instead when there's no room above. Keyboard focus shows it immediately.
  - **Hiding:** it hides when the pointer leaves, focus leaves, the control is clicked, the page scrolls, or Esc is pressed. Esc hiding a tooltip doesn't consume the key, so it still closes popups (`escape-shortcut.spec.md`).
  - **Placement:** the tooltip never covers the pointer, and stays inside the viewport.
  - **Where:** every `app-icon-button` (which covers favorite stars, row actions, close buttons, the header menu and the chevrons). Also the collapsed sidebar's icon-only links (Home, Projects, Pages, Diagrams, Boards toggle), which currently use `title`.
- **Rules:**
  - Screen readers keep getting the label through `aria-label`.
  - The native `title` is removed from these controls so two tooltips never show.
  - Touch devices show no tooltip.
- **Out of scope:** tooltips on text buttons (they already name themselves) and rich tooltips with formatting.

# Part 2 — Technical details

## 2.1 Tools and libraries
Angular CDK Overlay (already used for dropdowns and popups) with a flexible connected position strategy. No new dependencies.

## 2.2 Structure
- **`components/tooltip/tooltip.directive.ts`** (`TooltipDirective`, standalone, selector `[appTooltip]`, input `appTooltip: string`):
  - Listens to `mouseenter` / `mouseleave`, `focusin` / `focusout`, `click` and `keydown.escape` (without `preventDefault`).
  - Opens a CDK overlay attached to the host with positions top-centre, then bottom-centre (add `TOOLTIP_POSITIONS` to `config/` next to the existing overlay positions), and the reposition scroll strategy, or closes on scroll.
  - 300ms show delay on hover, none on focus. Cleans up in `ngOnDestroy`.
  - Skips when `matchMedia('(hover: none)')` matches.
- **`components/tooltip/tooltip.component.*`** (`TooltipComponent`): the bubble rendered in the overlay.
  - CSS block `tooltip`: dark background, `--font-xs` if `header-and-type-scale` is merged (otherwise 12px), 4px 8px padding, `--radius-sm`, a small shadow, `pointer-events: none`, and a short fade-in.
- **`icon-button.component.html`:** replace `[title]="tooltip"` with `[appTooltip]="tooltip"`, keeping `[attr.aria-label]`.
- **`dashboard-sidebar.component.html` and `sidebar-boards.component.html`:** collapsed-mode links use `[appTooltip]` instead of `[title]`. In expanded mode, where the label is visible, pass an empty string so no tooltip shows.

## 2.3 Decisions
1. **Styled tooltip everywhere** through a shared directive on `app-icon-button`, instead of fixing only the List rows.
2. **Own spec**, separate from `board-list-tab.spec.md`.
3. **Timing and placement:** 300ms hover delay, instant on focus, above with a fallback below. (Implementation choices, not ones the user asked for. Confirm during review.)
4. **Location:** the directive lives in `components/tooltip/` with its bubble component, rather than a new `directives/` folder, so no new path alias is needed. (Implementation choice, not one the user asked for.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Overlaps with other specs:**
- `radius-and-spacing.spec.md` and `header-and-type-scale.spec.md` set the radius and font tokens the bubble uses. Use whatever tokens exist when this is built.
- `escape-shortcut.spec.md`: the tooltip must not `preventDefault` Esc.
- `board-list-tab.spec.md` relies on this for visible row-action tooltips.

If `escape-shortcut` or `board-list-tab` is in progress on another branch and touches `icon-button`, stop and ask the user.

Baseline before starting: run `npm test` in `frontend/` and note the count here.

### A. Tooltip
- [ ] A1. Add `TOOLTIP_POSITIONS`, `TooltipComponent` and `TooltipDirective`.
- [ ] A2. Add `tooltip.directive.spec.ts`:
  - shows after the delay on hover
  - doesn't show if the pointer leaves first
  - shows at once on focus
  - hides on click and Esc without `defaultPrevented`
  - an empty text shows nothing

### B. Adoption
- [ ] B1. Use `appTooltip` in `app-icon-button` instead of `title`, and update `icon-button` tests if any check `title`.
- [ ] B2. Use `appTooltip` for the collapsed sidebar links and the boards toggle.

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Update `CLAUDE.md` (Components) to mention `appTooltip` for icon-only controls.
- [ ] Z3. Manual check in the running app:
  - Hover the backlog or List row actions, item tree actions, favorite stars, the popup close button and the collapsed sidebar: a styled tooltip appears after a short delay, above or below near the edges.
  - Tab to an icon button: the tooltip shows.
  - Esc hides it and still closes the popup.
