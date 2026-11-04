# New item split button — Spec

**Type:** feature
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

On the Pages and Diagrams screens, "New page" / "New diagram" in the toolbar and the "+" on a folder row always open a small menu with **Blank** and **From template**. Creating a blank item, by far the most common case, therefore takes two clicks, and the "+" on a folder gives no hint that it opens a menu at all.

This spec turns those three controls into **split buttons**: the main part creates a blank item with one click, and a separate chevron part next to it opens the existing Blank / From template menu.

- **Users:** any team member on the Pages or Diagrams screen.
- **Usage:**
  - **Toolbar:** "New page" (or "New diagram") looks like today's primary button with a "+" icon, followed by a narrow chevron segment attached to its right edge, separated by a thin divider. Clicking the main part opens the blank create popup at `…/new` immediately. Clicking the chevron opens a menu under it with **Blank** and **From template**; Blank does the same as the main part, From template opens the template picker, exactly as today.
  - **Folder row:** the row's "+" action becomes a compact split: the "+" icon button creates a blank item in that folder (`…/new?folder=<id>`), and a small chevron button next to it opens the same menu (Blank / From template in that folder).
  - Both parts are separate buttons with their own tooltip and accessible name: the main part keeps its label ("New page" in the toolbar; tooltip "New page" on the row "+"), and the chevron says "Creation options". The chevron announces that it opens a menu and whether it is open.
  - Keyboard: Tab reaches the main part, then the chevron. Enter or Space on either activates it. Esc closes the open menu (existing menu behaviour).
- **Rules:** no permission, data or API change. Hidden or shown exactly where the current controls are; the folder "+" keeps appearing in the row actions like today.
- **Out of scope:**
  - The board templates screen's "New template" menu (blank / from a board) and the sidebar "Create board" dialog: different flows, not part of the critique finding.
  - Focus moving into the opened menu and arrow-key navigation inside it: a `MenuButtonComponent`-wide behaviour shared by every menu, not specific to this control.
  - Row action visibility on keyboard focus and touch (`row-actions-keyboard-access.spec.md`).
  - What happens after Create (`create-flow-opens-item.spec.md`).

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. Reuses `MenuButtonComponent` (CDK connected overlay, panel, positions, Esc handling) through its `customTrigger` slot, `IconComponent`, `TooltipDirective` and the existing theme tokens.

## 2.2 Structure

### New shared component `SplitButtonComponent`

`frontend/src/app/components/split-button/` with `split-button.component.ts`, `.html`, `.css` (created with `npm run newcomponent split-button`, no spec file from the generator).

- Selector `app-split-button`, standalone, `ChangeDetectionStrategy.Eager`, imports `NgIf`, `MenuButtonComponent`, `IconComponent`, `TooltipDirective`.
- Inputs (all text inputs take already translated strings, like `app-icon-button`'s `tooltip`):
  - `@Input({required: true}) label!: string`: main part text (toolbar) or its tooltip and `aria-label` (compact).
  - `@Input({required: true}) menuLabel!: string`: the chevron's tooltip and `aria-label`.
  - `@Input({required: true}) options: MenuButtonOption[] = []`: passed to the menu.
  - `@Input() icon: IconName | null = null`: icon in the main part.
  - `@Input() compact = false`: icon-only row variant.
  - `@Input() disabled = false`: disables both parts.
- Outputs: `@Output() pressed = new EventEmitter<void>()` (main part), `@Output() picked = new EventEmitter<string | number | null>()` (re-emits the menu's `picked`).
- Template:
  ```html
  <div class="splitButton" [class.splitButton--compact]="compact">
    <button type="button" class="splitButton__main" [disabled]="disabled"
      [attr.aria-label]="compact ? label : null" [appTooltip]="compact ? label : ''" (click)="pressed.emit()">
      <app-icon *ngIf="icon" [name]="icon" class="splitButton__icon"></app-icon>
      <span *ngIf="!compact">{{ label }}</span>
    </button>
    <app-menu-button #menu [customTrigger]="true" [options]="options" [disabled]="disabled" (picked)="picked.emit($event)">
      <button type="button" class="splitButton__toggle" [disabled]="disabled"
        aria-haspopup="menu" [attr.aria-expanded]="menu.isOpen"
        [attr.aria-label]="menuLabel" [appTooltip]="menuLabel">
        <app-icon name="chevron-right" class="splitButton__chevron"></app-icon>
      </button>
    </app-menu-button>
  </div>
  ```
  (Shape only; adjust to the project's formatting. The chevron reuses `chevron-right` rotated 90° like `.menuButton__chevron`, since the icon set has no `chevron-down`.)
- `MenuButtonComponent` change: its custom trigger wrapper currently toggles on click even when `disabled` is set. In `menu-button.component.ts` `toggle()`, return early when `disabled` is true. No other change to the menu.
- CSS (`split-button.component.css`, camelCase BEM, tokens only, no hardcoded colours, well under the 2 kB warning):
  - `.splitButton`: `display: inline-flex`, `align-items: stretch`, `border-radius: var(--radius-sm)`.
  - Default variant: the gradient lives on the container so both segments read as one control: `background: var(--color-primary-gradient)`, `box-shadow: var(--shadow-button)`. `.splitButton__main` and `.splitButton__toggle` are transparent, `border: none`, `color: var(--color-on-primary)`, `font-family: var(--font-ui)`, `font-size: var(--font-sm)`, `font-weight: 600`, `min-height: var(--control-height)`, `cursor: pointer`. Main: `display: inline-flex; align-items: center; gap: var(--space-2); padding: 9px 14px 9px 20px` (matching `.button`), left radius only. Toggle: `width: 32px`, right radius only, `border-left: 1px solid color-mix(in srgb, var(--color-on-primary) 30%, transparent)`.
  - Hover on either segment: `background: color-mix(in srgb, var(--color-on-primary) 12%, transparent)`; `aria-expanded="true"` on the toggle keeps that background. Transitions only on `background-color` with `var(--transition-fast)` (no `transition: all`).
  - Disabled: `opacity: 0.5; cursor: not-allowed` on the container's buttons.
  - `.splitButton--compact`: no gradient and no shadow on the container; segments use the `.iconButton` look: `background: color-mix(in srgb, var(--color-tint) 6%, transparent)`, `color: var(--color-text-muted)`, height `28px`; main `width: 28px`, toggle `width: 24px` (WCAG 2.5.8 minimum target), a `1px` divider in `color-mix(in srgb, var(--color-tint) 16%, transparent)`; hover raises the tint to 12% and the colour to `var(--color-text-heading)`. Icons 16px, chevron 14px.
  - `focus-visible` on both segments: the app's standard focus ring (follow the outline style used by `.menuButton__option:focus-visible` / buttons in `styles.css`; if none applies to plain buttons, `outline: 2px solid var(--color-input-border-focus); outline-offset: 2px`).
  - Inside `menu-button`, `.menuButton__custom` is `inline-flex`, so the toggle stretches to the container height; give `app-menu-button` inside the split `display: flex` via `.splitButton app-menu-button { display: flex; }` in this component's stylesheet (the host element is in this component's view, so no `::ng-deep` is needed).

### Using it

- `frontend/src/app/pages/dashboard/document-pages/document-pages.component.html`: replace the toolbar `<app-menu-button [customTrigger]="true" …><app-button …>New page</app-button></app-menu-button>` with
  `<app-split-button icon="plus" [label]="PHRASES.NEW_PAGE | translate" [menuLabel]="PHRASES.CREATION_OPTIONS | translate" [options]="createOptions" (pressed)="handleCreateItem(null)" (picked)="handleCreateChoice($event)"></app-split-button>`.
  In `document-pages.component.ts` swap `MenuButtonComponent` for `SplitButtonComponent` in `imports` (keep `ButtonComponent`, still used by "New folder").
- `frontend/src/app/pages/dashboard/diagrams/diagrams.component.html` / `.ts`: the same with `PHRASES.NEW_DIAGRAM`.
- `frontend/src/app/components/item-tree/item-tree.component.html`: replace the folder row's `<app-menu-button [customTrigger]="true" …><app-icon-button icon="plus" …></app-menu-button>` with
  `<app-split-button [compact]="true" icon="plus" [label]="itemLabel" [menuLabel]="PHRASES.CREATION_OPTIONS | translate" [options]="createOptions" (pressed)="createItem.emit({ parentId: folder.id, fromTemplate: false })" (picked)="handleCreateChoice(folder.id, $event)"></app-split-button>`.
  In `item-tree.component.ts` swap `MenuButtonComponent` for `SplitButtonComponent` in `imports`.
- `FolderedListPageComponent` (`foldered-list-page.base.ts`) is unchanged: `createOptions`, `handleCreateItem` and `handleCreateChoice` already cover both paths.
- Clicks inside the row actions must not open or toggle the row: the current `app-menu-button` already sits inside `.itemTree__rowActions`; check that `handleFolderRowClick` in `item-tree.component.ts` ignores clicks from the new buttons the same way it ignores the other row action buttons (it checks the event target; extend the check if it relied on `app-icon-button` specifically).

### Translations

New key `CREATION_OPTIONS` in `frontend/src/app/config/phrases.ts`, placed next to `BLANK` / `FROM_TEMPLATE`, and in every translation file next to those keys:

| file | text |
|---|---|
| en | Creation options |
| lv | Izveides iespējas |
| et | Loomise valikud |
| lt | Kūrimo parinktys |
| ru | Варианты создания |
| sv | Skapandealternativ |
| fi | Luontivaihtoehdot |
| de | Erstellungsoptionen |
| da | Oprettelsesmuligheder |
| fr | Options de création |
| es | Opciones de creación |

### Parallel work

- `row-actions-keyboard-access.spec.md` changes how `.itemTree__rowActions` children are revealed (focus-within, touch) in `item-tree.component.css` / `item-tree-row`. This spec only swaps the one `app-menu-button` element inside the folder row's actions for `app-split-button`; its reveal rule targets `.itemTree__rowActions > *`, which covers the new element as well. Whichever lands second checks the folder "+" split is revealed on focus.
- `create-flow-opens-item.spec.md` changes `foldered-item-detail.base.ts`, `foldered-list-page.base.ts` (removes `createdItem`) and the detail templates; this spec does not touch them.
- `accessible-control-names.spec.md` adds an accessible name to the Pages / Diagrams search input in the same toolbar; keep both edits when merging the toolbar block.
- `empty-states-guidance.spec.md` may add a "New page" call to action to the empty Pages / Diagrams state; if it does, it should reuse `app-split-button` (or a plain blank-create button) rather than the old menu.
- Translation files: add `CREATION_OPTIONS` next to `BLANK` / `FROM_TEMPLATE`, not at the end, to avoid merge conflicts.

## 2.3 Decisions

1. **Which control pattern?** (2026-11-04) A split button: main part = blank item, chevron = menu. Reason: Nielsen #7 flexibility and efficiency (the frequent action in one click) and Impeccable operate.md "Standard navigation patterns … earn their place": the split button is the known desktop pattern for "default action plus alternatives". Rejected: keeping the menu (two clicks for the common case, the critique finding); a separate "From template" button next to "New page" (more toolbar width, and the row "+" has no room for it).
2. **What does the chevron menu contain?** (2026-11-04) Blank and From template, as today. Reason: the brief and Nielsen #6 recognition: the menu names both choices, so the chevron explains what the main part does; a menu with a single entry reads as broken. Rejected: the chevron opening the template picker directly (a chevron that does not open a menu is an invented affordance, Impeccable operate.md "Reinventing standard affordances").
3. **Folder row "+" too?** (2026-11-04) Yes, as a compact split (28px "+" plus 24px chevron). Reason: Nielsen #4 consistency between the toolbar and the row; 24px keeps the chevron at the WCAG 2.5.8 minimum target size. Rejected: "+" creating blank with templates only from the toolbar (loses the folder-scoped template path that exists today).
4. **New component or a mode of `MenuButtonComponent`?** (2026-11-04) A new `SplitButtonComponent` that composes `MenuButtonComponent` through `customTrigger`. Reason: CLAUDE.md "reuse the shared components": the overlay, panel, positions and Esc handling stay in one place, and `MenuButtonComponent`'s stylesheet stays within budget. Rejected: adding a split mode to `MenuButtonComponent` (mixes two controls and grows its CSS towards the 2 kB warning); restyling `app-button` from outside (needs `::ng-deep`).
5. **One gradient or two buttons?** (2026-11-04) The primary gradient on the container, transparent segments with an `on-primary` divider. Reason: the two parts read as one control with two hit areas (Impeccable craft-floor "Declare elevation once"), and the divider marks the split without a second colour. Rejected: two separately styled `app-button`s side by side (double shadows and a gap that reads as two unrelated buttons).
6. **Chevron name?** (2026-11-04) "Creation options", with `aria-haspopup="menu"` and `aria-expanded`. Reason: Impeccable craft-floor "Controls name their action"; WCAG 4.1.2 name, role, value. Rejected: "More" (ambiguous next to other row actions); reusing the item label (two buttons with the same name).
7. **Keyboard inside the menu?** (2026-11-04) Unchanged in this spec. Reason: the menu is shared by every `app-menu-button`; changing its focus handling belongs in its own fix. Rejected: adding focus-first-item only for split buttons (inconsistent menus, Nielsen #4).
8. **`disabled` on a custom trigger?** (2026-11-04) `MenuButtonComponent.toggle()` ignores clicks while `disabled`. Reason: the split button passes `disabled` to both parts, and the custom trigger wrapper would otherwise still open the menu. Low risk: no current caller sets `disabled` together with `customTrigger`.

### Decisions to double-check

- Decision 2 keeps "Blank" in the chevron menu although the main part does the same; the brief asked for it, but it is a redundant entry.
- Decision 8 touches `MenuButtonComponent`, which is shared by the comment, selection-bar, manage-team and templates menus (behaviour unchanged for them, since none disables a custom trigger).

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Shared split button
- [x] A1. Add `CREATION_OPTIONS` to `frontend/src/app/config/phrases.ts` next to `BLANK` / `FROM_TEMPLATE`, and to all 11 files in `frontend/public/assets/translations/` next to the same keys, with the texts in Part 2.2.
- [x] A2. In `frontend/src/app/components/menu-button/menu-button.component.ts` make `toggle()` return without changing `isOpen` while `disabled` is true.
- [x] A3. Generate `SplitButtonComponent` with `npm run newcomponent split-button` in `frontend/` and implement the TS, HTML and CSS as described in Part 2.2 (inputs `label`, `menuLabel`, `options`, `icon`, `compact`, `disabled`; outputs `pressed`, `picked`; default and compact looks; focus-visible ring; tokens only; no `transition: all`; no comments).
- [x] A4. Add `frontend/src/app/components/split-button/split-button.component.spec.ts` with `TestBed`: clicking the main part emits `pressed` and does not open the menu; clicking the chevron sets `aria-expanded="true"` and shows both menu options; picking "From template" emits `picked` with `'template'`; with `disabled` neither part emits nor opens; in compact mode the main part has the `label` as `aria-label` and no visible text. Run `npm test`.

### B. Use it on Pages, Diagrams and folder rows
- [x] B1. `frontend/src/app/pages/dashboard/document-pages/document-pages.component.html` / `.ts`: replace the toolbar menu with `app-split-button` as in Part 2.2; swap the import.
- [x] B2. `frontend/src/app/pages/dashboard/diagrams/diagrams.component.html` / `.ts`: the same for "New diagram".
- [x] B3. `frontend/src/app/components/item-tree/item-tree.component.html` / `.ts`: replace the folder row "+" menu with the compact `app-split-button`; swap the import. Verify `handleFolderRowClick` ignores clicks on both new buttons (a click on either must not expand or collapse the folder); adjust its target check if needed.
- [x] B4. Tests: in `frontend/src/app/pages/dashboard/document-pages/document-pages.component.spec.ts` keep the existing `handleCreateItem` / `handleCreateChoice` tests and add one asserting `handleCreateItem(null)` navigates to `…/new` with no query params (the main part's path) if not already covered. In `frontend/src/app/components/item-tree/item-tree.component.spec.ts` add a test that the folder row's split main part emits `createItem` with `{parentId: <folder id>, fromTemplate: false}` and does not toggle the folder. Run `npm test`.

### C. Docs
- [x] C1. Update `CLAUDE.md`: in the Templates bullet replace '"New page" / "New diagram" and a folder\'s "+" are `MenuButtonComponent`s with `customTrigger` offering Blank / From template' with: they are `SplitButtonComponent`s (`app-split-button`, `compact` on folder rows) whose main part creates a blank item and whose chevron opens the Blank / From template menu (a `MenuButtonComponent` with `customTrigger`). Add `app-split-button` to the Components conventions as the shared control for a default action plus alternatives.

### Z. Wrap-up
- [x] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test` and `npm run build` in `frontend/`); the new component's stylesheet must stay under the 2 kB warning.
- [ ] Z2. Manual check in the running app, in Purple haze dark and Paper light: Pages → click "New page" → blank create popup opens in one click. Click the chevron → menu with Blank / From template under it → From template opens the picker. Hover a folder row → "+" creates a blank page in that folder, its chevron opens the menu, neither toggles the folder. Tab through the toolbar: main part, then chevron, both with a visible focus ring; Enter on the chevron opens the menu, Esc closes it. Repeat on Diagrams. **Not done (2026-11-04):** the app's dev-server slots for this folder were all held by other sessions and port 3000 was in use, so the browser check is left for the coordinator.
