# Popup clipping fix — Spec

**Type:** bug fix
**Status:** ready for implementation
**Last updated:** 2026-10-22

# Part 1 — Business logic and usage

**What goes wrong:** popups are cut off by the window they open in. In the ticket popup, the "Add assignee" picker (search field plus member list) is clipped on the right. Its panel is 220px wide and absolutely positioned inside the 220px side column. The popup body scrolls (`overflow-y: auto`), and that also clips anything that sticks out sideways. The page/diagram detail sidebar has the same setup, so any popup opened there would be clipped too.

**Expected:** a popup is never clipped by any container, in any window. It appears next to the control that opened it, stays fully on screen, and draws above everything else.

**How to reproduce:**
1. Open a board and open a ticket (Kanban or Backlog tab).
2. Click "+ Add assignee" in the ticket's side column.
3. The search field and member list are cut off on the right.

- **Users:** everyone who opens a popup: the assignee picker, the header user menu, and the shared `app-dropdown` from `project-selector-dropdown.spec.md`.
- **Usage:**
  - Popups open below their trigger, aligned to its left edge. The header user menu is the exception: it aligns to the trigger's right edge, as it does today.
  - When there isn't room below, the popup opens above. When there isn't room on one side, it shifts to stay on screen.
  - The popup follows its trigger when the page or a window scrolls.
  - Clicking outside a popup closes it. Clicking its trigger still toggles it. Escape still closes the assignee picker.
  - The look of each popup stays the same.
- **Rules:** UI only. Nothing changes in what each popup does.
- **Out of scope:**
  - Tooltips. Icon buttons use the native `title` attribute, which the browser draws and which can't be clipped.
  - Dialogs (confirm, new project and so on). They are already fixed-position overlays.

# Part 2 — Technical details

## 2.1 Tools and libraries
The Angular CDK Overlay (`@angular/cdk/overlay`). `@angular/cdk` is already a dependency, so there's no new package. Add CDK's prebuilt overlay styles `node_modules/@angular/cdk/overlay-prebuilt.css` before `src/styles.css` in both `styles` arrays in `frontend/angular.json` (build and test).

## 2.2 Structure

**New config:** `src/app/config/overlayPositions.ts`
- `DROPDOWN_POSITIONS: ConnectedPosition[]` in this order: below and start-aligned, above and start-aligned, below and end-aligned, above and end-aligned. Each has a 4px offset from the trigger.
- `MENU_POSITIONS: ConnectedPosition[]`: the same, but end-aligned first.

**Pattern for every popup.** It uses CDK's directives directly, with no wrapper component:
- Import `OverlayModule` in the component.
- The trigger gets `cdkOverlayOrigin #origin="cdkOverlayOrigin"`.
- The panel moves into `<ng-template cdkConnectedOverlay>` with:
  - `[cdkConnectedOverlayOrigin]="origin"`
  - `[cdkConnectedOverlayOpen]="isOpen"`
  - `[cdkConnectedOverlayPositions]="DROPDOWN_POSITIONS"` (or `MENU_POSITIONS`)
  - a reposition scroll strategy
  - `(overlayOutsideClick)="handleOutsideClick($event)"`
  - `(detach)="close()"`
- `handleOutsideClick` closes the popup unless the click target is inside the trigger element. Otherwise a click on the trigger would close the popup and then toggle it straight back open.
- The panel is no longer inside the component's host element, so the `@HostListener('document:click')` handlers that check `closest(...)` / `contains(...)` are removed. `overlayOutsideClick` replaces them.
- Panel CSS drops `position: absolute`, `top`, `left`/`right` and `z-index`. The CDK overlay container sits above the app's popup windows (z-index 50 and 60). Component-scoped styles still apply, because the template belongs to the same component.

**`TicketAssigneesComponent`:**
- Apply the pattern to the picker.
- `isPickerOpen`, `togglePicker()` and `closePicker()` stay.
- Remove `handleDocumentClick` and the `ElementRef` constructor dependency if nothing else uses it.
- Keep Escape closing the picker on the panel.
- Keep the search field focused when the picker opens. If `autofocus` doesn't work inside the overlay, focus it from the overlay's `(attach)` event.

**`DashboardHeaderComponent`:**
- Apply the pattern to the user menu, with `MENU_POSITIONS`.
- Remove `handleDocumentClick`.
- `.dashboardHeader__dropdown` keeps its look and its `dropdownEnter` animation.

**`DropdownComponent`** (from `project-selector-dropdown.spec.md`): that spec has been amended to use this pattern from the start. If this fix lands first, it adds `overlayPositions.ts` and the prebuilt CSS that the dropdown then uses.

## 2.3 Decisions
1. **Approach:** CDK Overlay. Popups render in an overlay layer at the top of the page, so no container can clip them. Rejected: our own `position: fixed` maths, which means more code to maintain for scroll and resize, and fitting popups inside their containers, which still clips in short or narrow containers.
2. **Which popups:** the assignee picker, the header user menu and `app-dropdown`. The user menu isn't clipped today, but it moves too so every popup uses one mechanism. Leaving it as is was rejected.
3. **How components use it:** `cdkOverlayOrigin` and `cdkConnectedOverlay` directly in each template, with shared positions in one config file. A shared `app-popover` wrapper component was rejected as an extra abstraction.
4. **Relation to the dropdown spec:** `project-selector-dropdown.spec.md` was amended so `app-dropdown` is built on the overlay from the start. Retrofitting it afterwards was rejected.
5. **Scrolling:** popups reposition to follow their trigger instead of closing. (Implementation choice, not one the user asked for.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend `npm test`, 375 of 375 passing.

### A. Overlay setup
- [ ] A1. Add `@angular/cdk/overlay-prebuilt.css` to both `styles` arrays in `frontend/angular.json`, before `src/styles.css`.
- [ ] A2. Add `src/app/config/overlayPositions.ts` with `DROPDOWN_POSITIONS` and `MENU_POSITIONS`.

### B. Move popups onto the overlay
- [ ] B1. Rewrite the `TicketAssigneesComponent` picker (ts, html, css) as described in 2.2. Update `ticket-assignees.component.spec.ts`:
  - The `handleDocumentClick` tests are replaced with `handleOutsideClick` tests: an outside target closes the picker, and a target inside the trigger doesn't.
  - The other tests stay.
- [ ] B2. Rewrite the `DashboardHeaderComponent` user menu (ts, html, css) as described in 2.2. Add or extend `dashboard-header.component.spec.ts` with the same two outside-click cases.
- [ ] B3. If `DropdownComponent` already exists, check that it follows the pattern (see `project-selector-dropdown.spec.md`). If it doesn't exist yet, nothing to do.

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`. All tests pass and no style budget is exceeded.
- [ ] Z2. Manual check in the running app:
  - Open a ticket and open "+ Add assignee": the whole picker is visible, search works, picking assigns, and clicking outside or pressing Escape closes it.
  - Scroll the ticket body while the picker is open: it follows its trigger.
  - Open the header user menu: it is right-aligned under the trigger, every item works, and clicking outside or on the trigger closes it.
  - Make the window short and open a popup near the bottom: it opens upwards.
