# Detail close button placement — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

In item detail popups, the close (X) button sits alone on the far left while every other action sits on the right. Close moves to the far right, as the last action, so every header action is in one group.

- **Users:** everyone who opens a page, diagram or ticket.
- **Usage:**
  - **Page and diagram popup, view mode:** `[favorite] [Delete] [Edit] [X]`, right-aligned.
  - **Page and diagram popup, edit mode:** `[Cancel] [Save] [X]`, right-aligned.
  - **Ticket popup:** `[Move to backlog / Move to board] [favorite] [delete] [X]`, right-aligned.
  - Close keeps its current behaviour and tooltip.
- **Rules:** no behaviour change, only placement.
- **Out of scope:** create mode for pages and diagrams. `create-on-confirm.spec.md` adds its own `[Cancel] [Create] [X]` header and follows this placement.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing Angular and CSS. No new dependencies.

## 2.2 Structure
- **`components/item-detail-layout/item-detail-layout.component.html`:** move the close `app-icon-button` out of the start of `.itemDetail__header` and into the end of both `.itemDetail__actions` blocks (view and edit), or put one close button after both blocks inside a single right-aligned wrapper.
- **`item-detail-layout.component.css`:** `.itemDetail__header` becomes `justify-content: flex-end`. Keep `align-items: center`.
- **`pages/dashboard/ticket-detail/ticket-detail.component.html` and `.css`:** the same change. Close goes after the delete button in `.ticketDetail__headerActions`, and the header is right-aligned.

## 2.3 Decisions
1. **Scope:** page, diagram and ticket popups. Only pages and diagrams was rejected.
2. **Position:** close is the last (rightmost) item, after the primary action.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Overlaps with other specs:** `create-on-confirm.spec.md`, `escape-shortcut.spec.md`, `radius-and-spacing.spec.md` and `ticket-priorities.spec.md` also change `item-detail-layout` or `ticket-detail`. If any of them is in progress on another branch, stop and ask the user before editing those files. This spec is meant to land before them.

Baseline before starting: run `npm test` in `frontend/` and note the count here.

### A. Placement
- [ ] A1. Move close to the far right in `item-detail-layout` (HTML and CSS) for view and edit mode.
- [ ] A2. Do the same in `ticket-detail` (HTML and CSS).
- [ ] A3. Update any existing spec tests that look up the close button by position (search `*.spec.ts` for `icon="x"` or `CLOSE`).

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Manual check in the running app: open a page (view and edit), a diagram (view and edit) and a ticket. The X is the rightmost action and still closes the popup. Check at narrow widths (below 720px) that the header doesn't overflow.
