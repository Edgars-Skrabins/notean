# Window and input spacing — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-22

# Part 1 — Business logic and usage

The app should look modern without wasting space. Two spacing changes do that:

1. **Gap around the inspect popups.** The ticket popup sits 10% of the screen height and 14% of the width away from the screen edges, which is huge on large screens. The page/diagram detail popup uses 3% and 4% (about 77px on a wide screen). Both popups now sit 24px from every screen edge.
2. **Input padding.** Text inputs and textareas use 11–18px of padding today. Every regular text input and textarea gets exactly 10px on all sides.

- **Users:** everyone.
- **Usage:**
  - Opening a ticket, page or diagram shows its popup filling the screen minus 24px on every side.
  - Every regular text field (login, register and team pages, dialogs, list searches, item titles, the ticket description, the project form, the backlog quick-create field) has 10px padding.
- **Rules:** styling only. No behaviour changes.
- **Out of scope:**
  - **Padding inside the popups** (32px) and the **dashboard content area padding** (32px). The user only asked to cap the gap around the popups.
  - **Compact inline editors** that are already under 10px keep their size, so rows and headers don't jump while editing:
    - sidebar tree rename (`itemTree__renameInput`, 4px 8px)
    - kanban column title (`kanbanColumn__titleInput`, 4px 8px)
    - diagram label editor (`flowchartEditor__labelInput`, 4px 8px)
    - board title (`boardPage__titleInput`, 6px 10px)
    - assignee search (`ticketAssignees__search`, 6px 8px)
  - **The rich-text editor's writing area** (`richTextEditor__host`, 14px 18px). It's an editor surface rather than an input field, so it was left as is.
  - **Buttons and the dropdown trigger.**

# Part 2 — Technical details

## 2.1 Tools and libraries
CSS only. No new dependencies.

## 2.2 Structure

**Popup gap:** use the existing `--space-5` token, which is 24px.
- `pages/dashboard/ticket-detail/ticket-detail.component.css`: `.ticketDetail` `inset: 10vh 14vw` → `inset: var(--space-5)`.
- `components/item-detail-layout/item-detail-layout.component.css`: `.itemDetail` `inset: 3vh 4vw` → `inset: var(--space-5)`.

**Input padding → `padding: 10px`:**

| File | Rule | Now |
|---|---|---|
| `src/styles.css` | `.authField input` | 14px 18px |
| `components/create-named-item-dialog/create-named-item-dialog.component.css` | `.createNamedItemDialog__input` | 14px 18px |
| `components/delete-project-dialog/delete-project-dialog.component.css` | `.deleteProjectDialog__input` | 10px 12px |
| `components/item-detail-layout/item-detail-layout.component.css` | `.itemDetail__titleInput` | 12px 16px |
| `components/project-form/project-form.component.css` | `.projectForm__textarea` | 12px 16px |
| `pages/dashboard/ticket-detail/ticket-detail.component.css` | `.ticketDetail__titleInput` | 8px 12px |
| `pages/dashboard/ticket-detail/ticket-detail.component.css` | `.ticketDetail__descriptionInput` | 12px |
| `pages/dashboard/document-pages/document-pages.component.css` | `.pagesView__search` | 11px 16px |
| `pages/dashboard/diagrams/diagrams.component.css` | `.diagramsView__search` | 11px 16px |
| `pages/dashboard/backlog-tab/backlog-tab.component.css` | `.backlogTab__createInput` | 10px 12px |

`.projectForm__textarea` currently shares its rule with `.projectForm__select`. If `PROJECT_SELECTOR_DROPDOWN_SPEC.md` hasn't removed the select yet, split the rule so only the textarea changes.

## 2.3 Decisions
1. **What "outer padding" means:** only the gap between the inspect popups and the screen edges, capped at 24px. Rejected: reducing the padding inside the popups and the dashboard content area padding (both 32px).
2. **Which popups:** both the ticket popup and the page/diagram detail popup. Ticket-only was rejected.
3. **Input padding shape:** 10px on all sides. Rejected: 10px vertical only, and 10px 12px.
4. **Auth pages included:** the shared `.authField input` style on the login, register and team pages also gets 10px. Dashboard-only was rejected.
5. **Compact inline editors keep their size.** Bringing them up to 10px was rejected because rows and column headers would jump while editing.
6. **The rich-text editor area is excluded,** as an editor surface rather than an input field. (Implementation choice, not one the user asked for. Confirm or include it.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend `npm test`, 375 of 375 passing.

### A. Popup gap
- [ ] A1. Set `.ticketDetail` to `inset: var(--space-5)` in `ticket-detail.component.css`.
- [ ] A2. Set `.itemDetail` to `inset: var(--space-5)` in `item-detail-layout.component.css`.

### B. Input padding
- [ ] B1. Set `padding: 10px` on every rule in the table in 2.2, splitting the project form rule if needed.
- [ ] B2. Search `src/` for any other regular text input or textarea rule with padding above 10px that the table missed, for example a new one added since this spec. Bring it to 10px, and leave the compact inline editors listed in Part 1 alone.

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`. All tests pass and no style budget is exceeded.
- [ ] Z2. Manual check in the running app:
  - Open a ticket, a page and a diagram: each popup is 24px from every screen edge.
  - Check the inputs on the login page, the create dialogs, the pages/diagrams search, the item and ticket titles, the ticket description, the project form and the backlog quick-create field: all have 10px padding and none look cramped.
  - Rename an item in the sidebar tree and a kanban column: their size is unchanged.
