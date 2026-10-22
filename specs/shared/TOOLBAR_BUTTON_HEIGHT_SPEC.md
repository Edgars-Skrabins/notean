# Toolbar button height — Spec

**Type:** bug fix
**Status:** ready for implementation
**Last updated:** 2026-10-22

# Part 1 — Business logic and usage

**What goes wrong:** on the Pages and Diagrams list screens, the toolbar has a search field followed by "New folder" and "New page" (or "New diagram") buttons. The buttons are shorter than the search field. They also differ from each other: the ghost "New folder" button has a 1px border and the primary button has none, so the primary one is 2px shorter still.

**Expected:** both toolbar buttons are exactly as tall as the search field, on every list screen with this toolbar.

**How to reproduce:** open Pages or Diagrams in the dashboard and compare the heights of the search field and the two buttons next to it.

- **Users:** everyone on the Pages and Diagrams screens.
- **Usage:** the toolbar's search field and buttons line up top and bottom. The buttons' text and icons stay vertically centered.
- **Rules:** styling only.
- **Out of scope:** buttons elsewhere, such as dialogs, the Projects page "New project" button (no search field next to it) and board actions. Their size doesn't change.

# Part 2 — Technical details

## 2.1 Tools and libraries
CSS only. No new dependencies.

## 2.2 Structure
- `components/button/button.component.css`: add `:host { display: inline-flex; }`. The inner `.button` then stretches to the host's height whenever the host is stretched, and looks the same as today everywhere else.
- `pages/dashboard/document-pages/document-pages.component.css`: `.pagesView__toolbar` changes from `align-items: center` to `align-items: stretch`, so the buttons take the search field's height.
- `pages/dashboard/diagrams/diagrams.component.css`: the same for `.diagramsView__toolbar`.
- `.button` already uses `align-items: center`, so content stays centered when the button is taller.

The heights follow the search field automatically, so they stay matched when `WINDOW_AND_INPUT_SPACING_SPEC.md` changes the search padding.

## 2.3 Decisions
1. **Approach:** toolbar buttons stretch to the search field's height. A shared fixed `--control-height` token was rejected because it has to be kept in sync by hand.
2. **Scope:** the Pages and Diagrams toolbars, which are the only toolbars with a search field next to create buttons.
3. **Host display:** `ButtonComponent` gets `:host { display: inline-flex; }` so stretching reaches the inner button. (Implementation choice, not one the user asked for. Check that other buttons look unchanged.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend `npm test`, 375 of 375 passing.

### A. Fix
- [ ] A1. Add `:host { display: inline-flex; }` to `button.component.css`.
- [ ] A2. Set `align-items: stretch` on `.pagesView__toolbar` and `.diagramsView__toolbar`.

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Manual check in the running app:
  - On Pages and Diagrams, the search field and both buttons have identical heights, with icons and text centered.
  - Buttons on the Projects page, in dialogs and on the board page look unchanged.
