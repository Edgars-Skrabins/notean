# Dialog accessibility — Spec

**Type:** bug fix
**Status:** ready for implementation
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

Notean's dialogs and popups look modal but are not modal to keyboard and screen-reader users. None of them has `role="dialog"`, `aria-modal` or a focus trap, and none moves focus in or back out. Measured in the UX critique (2026-11-04): when "Discard unsaved changes?" opens over a page in edit mode, focus stays in the editor behind it, Tab walks into the page underneath, and a screen reader never hears that a dialog opened.

What goes wrong today, reproducible on master `f15abdf`:

1. Open a page, click *Edit*, type something, press Esc. The "Discard unsaved changes?" confirm appears, but `document.activeElement` is still the editor. Tab moves through the popup and then the dashboard behind it.
2. Open any small dialog (New folder, Delete project, Move to board, …). Focus stays on the button that opened it, or drops to `<body>`. Tab leaves the dialog.
3. Close a dialog. Focus goes to `<body>`, so the next Tab starts at the top of the document.
4. A screen reader announces nothing when a dialog or popup opens. It has no role, name or modal state.

Expected behaviour after the fix:

- **Users:** everyone who uses the keyboard or a screen reader, and anyone who presses Tab or Enter by habit after a dialog opens.
- **Usage:**
  - When a dialog or popup opens, focus moves into it: to its first field, to *Cancel* when its main action is destructive, or to the panel itself for content popups (rules in 2.3).
  - A screen reader announces it as a dialog with its title (or its message, for plain confirms) and treats the rest of the page as inert.
  - Tab and Shift+Tab cycle inside the dialog and never reach the page underneath. Dropdowns, menus, the mention picker, the emoji picker and tooltips opened from inside a dialog keep working as they do now.
  - When it closes, by any route (button, backdrop click, Esc, or the item being saved or deleted), focus returns to the element that was focused when it opened, if that element is still on the page.
  - A dialog opened from a menu item (for example *Delete* in a row's `…` menu) returns focus to that menu's trigger button, because the menu item itself is gone by then.
  - In the page, diagram and template popups, switching between view and edit mode moves focus to the title field (edit) or to the popup panel (view), instead of dropping it to `<body>` when the clicked button disappears.
  - Mouse users see no change, except that clicking empty space inside a panel no longer moves focus to `<body>`.
- **Rules:** the existing Esc behaviour through `EscapeService` stays as it is: the top layer closes, and inner controls that use Esc call `preventDefault()`. Nothing about what dialogs do changes, only their semantics and focus.
- **Out of scope:**
  - Returning focus to the list row after closing a page or diagram popup. Those popups replace the list route, so the row that opened them is gone. Restoring it needs the list to remember and refocus the item, which is a separate change.
  - Scroll locking of the page behind a dialog. It isn't an accessibility failure, and the backdrop already covers it.
  - CDK overlay panels that are not modal: dropdowns, menus, the mention picker, global search results and the diagram comment-pin thread. They already close on Esc and outside click. The comment-pin thread is a non-modal popover.
  - Error and status message roles inside dialogs. These belong to `announced-status-messages`.
  - Accessible names of individual inputs outside the dialog wrapper. These belong to `accessible-control-names`.

# Part 2 — Technical details

## 2.1 Tools and libraries

- `@angular/cdk/a11y` (`CdkTrapFocus`, already installed with `@angular/cdk` 22.2): the `cdkTrapFocus` directive with `cdkTrapFocusAutoCapture`, which focuses the initial element on init and refocuses the previously focused element on destroy, plus the `cdkFocusInitial` attribute.
- No new dependencies.

## 2.2 Structure

### Shared pattern

Every modal dialog and popup follows one markup pattern:

```html
<div class="xOverlay" cdkTrapFocus [cdkTrapFocusAutoCapture]="true">
  <div class="xOverlay__backdrop" (click)="..."></div>
  <div class="x" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" tabindex="-1">
    <h3 class="x__title" [id]="titleId">...</h3>
    ...
  </div>
</div>
```

- `cdkTrapFocus` goes on the overlay wrapper, which already holds the backdrop and the panel, and for the popups also their nested confirm dialogs. Nested dialogs then get their own trap inside the outer one.
- The panel carries `role`, `aria-modal="true"`, `tabindex="-1"` and its name. `tabindex="-1"` lets a click on empty panel space keep focus inside, and lets the panel itself take initial focus where the rules say so (`cdkFocusInitial` on the panel).
- `role="alertdialog"` is used for the two message-only interrupts (`ConfirmDialogComponent`, `EditConflictDialogComponent`), labelled by their message paragraph. Everything else is `role="dialog"`, labelled by its title.
- Ids come from a new pure helper `uniqueId(prefix)` in `@utils/uniqueId` (module-level counter, returns `` `${prefix}-${n}` ``). Each component sets `protected readonly titleId = uniqueId('confirmDialog')` (prefix = the component's camelCase name).
- `styles.css` gets one rule, placed right after the `.popupPanel` block: `[role='dialog'][tabindex='-1']:focus, [role='alertdialog'][tabindex='-1']:focus { outline: none; }`. The panel is a programmatic focus target, not a tab stop. Interactive controls inside keep their focus rings.
- `ButtonComponent` (`components/button/`) gets `@Input() initialFocus = false`, rendered as `[attr.cdkFocusInitial]="initialFocus ? '' : null"` on its inner `<button>`, so a dialog can put initial focus on an `app-button` without CDK's "not focusable" dev warning.

### Per dialog

| Component (`components/…` unless noted) | Role, name | Initial focus |
|---|---|---|
| `confirm-dialog` | `alertdialog`, labelled by `.confirmDialog__message` | *Cancel* (`initialFocus`) |
| `edit-conflict-dialog` | `alertdialog`, labelled by `.editConflictDialog__message` | panel (`cdkFocusInitial` on the panel) |
| `create-named-item-dialog` | `dialog`, labelled by `.createNamedItemDialog__title`; its name input also gets `[attr.aria-labelledby]="titleId"` | name input: `cdkFocusInitial` replaces the unreliable `autofocus` attribute |
| `create-chat-channel-dialog`, `chat-channel-settings-dialog` | inherit from `create-named-item-dialog` | inherit (name input) |
| `template-picker-dialog` | `dialog`, labelled by `.templatePicker__title` | first tabbable (the template search) |
| `board-picker-dialog` | `dialog`, labelled by `.boardPicker__title` | first tabbable (first board, or *Cancel*) |
| `move-to-board-dialog` | `dialog`, labelled by `.moveToBoardDialog__title` | first tabbable (first column radio) |
| `delete-folder-dialog` | `dialog`, labelled by `.deleteFolderDialog__title` | *Cancel* (`initialFocus`) |
| `delete-project-dialog` | `dialog`, labelled by `.deleteProjectDialog__title` | first tabbable (the "keep items" radio) |
| `folder-project-dialog` | `dialog`, labelled by `.folderProjectDialog__title` | first tabbable (project select) |
| `new-project-dialog` | `dialog`, labelled by `.newProjectDialog__title` | project name input (`cdkFocusInitial` on the name `<input>` in `project-form.component.html`) |
| `project-settings-dialog` | `dialog`, labelled by `.projectSettingsDialog__title` | project name input (same attribute), or first tabbable when read-only |
| `attachment-preview` | `dialog`, labelled by `.attachmentPreview__name` | panel |
| `item-detail-layout` (page, diagram and template popups) | `dialog` on `.itemDetail`; view mode `aria-labelledby` the `h1.itemDetail__title`; edit and create mode `[attr.aria-label]="draftTitle \|\| (titlePlaceholder \| translate)"` | view: panel (`[attr.cdkFocusInitial]="mode === 'view' ? '' : null"` on `.itemDetail`); edit and create: the title input (`cdkFocusInitial`) |
| `pages/dashboard/ticket-detail` | `dialog` on `.ticketDetail`, `[attr.aria-label]="ticket.title \|\| (PHRASES.TICKET_TITLE_PLACEHOLDER \| translate)"` | panel |

Mode switch in `ItemDetailLayoutComponent`: it gets `@ViewChild(CdkTrapFocus) trapFocus` and implements `OnChanges`. When `mode` changes and it isn't the first change, it calls `this.trapFocus?.focusTrap.focusInitialElementWhenReady()`, so the element marked for the new mode takes focus.

### Focus return from menus

`MenuButtonComponent` (`components/menu-button/`): `pick(option)` first focuses the trigger, then closes and emits. The trigger is the first focusable element inside `.menuButton__origin`: the built-in `.menuButton__trigger`, or the first `button, [href], [tabindex]:not([tabindex='-1'])` inside `.menuButton__custom`. Esc inside the panel does the same before closing. Any dialog opened from a menu option then captures the trigger as its "previously focused" element. `DropdownComponent` already refocuses its trigger and is unchanged.

### Files

- New: `frontend/src/app/utils/uniqueId.ts`, `uniqueId.spec.ts`, `components/confirm-dialog/confirm-dialog.component.spec.ts`, `components/menu-button/menu-button.component.spec.ts`, `components/item-detail-layout/item-detail-layout.component.spec.ts`.
- Changed: the `.html` and `.ts` of every component in the table, `components/button/button.component.{ts,html}`, `components/menu-button/menu-button.component.ts`, `components/project-form/project-form.component.html` (one attribute), `frontend/src/styles.css` (one rule), `CLAUDE.md`.
- No backend changes, no translation changes.

### Parallel work

- `announced-status-messages` also edits `create-named-item-dialog.component.html` (its error line and `aria-invalid` / `aria-describedby` on the same name input), `project-form.component.html` (name error and the same name input), the `.authStatus` lines in `item-detail-layout.component.html` and `ticket-detail.component.html`, and `styles.css`. This spec only adds attributes to the wrappers, panels and titles and `cdkFocusInitial` / `aria-labelledby` on those inputs. When merging, keep both sets of attributes.
- `accessible-control-names` adds `aria-label` to the title input in `item-detail-layout.component.html` and `ticket-detail.component.html`. Keep both specs' attributes on those inputs.
- `create-flow-opens-item` wants the title field focused in create mode. This spec already does that with `cdkFocusInitial` on the title input. Whichever branch merges second keeps that one mechanism and drops any second focus call.
- `trash-undo-without-confirm` removes some `app-confirm-dialog` usages and changes confirm texts. It doesn't touch `ConfirmDialogComponent`'s markup. No conflict, but the dialogs that remain get this behaviour automatically.
- `new-item-split-button` and `row-actions-keyboard-access` may edit `menu-button`. This spec only changes `pick()`, the Esc handler and a private focus helper. Keep them.
- `ui-copy-consistency` edits button styles in `styles.css`, and `item-title-hierarchy` may restyle `.itemDetail__title`. Neither touches the attributes added here.

## 2.3 Decisions

1. **Mechanism: CDK `cdkTrapFocus` with `cdkTrapFocusAutoCapture` on the existing overlays** (2026-11-04). Reason: the brief prefers CDK a11y, which is already installed. It is the known pattern for this stack (Impeccable operate.md: "Reinventing standard affordances… non-standard modals" is a product constraint), and auto-capture gives initial focus and focus return in one directive. Its anchor-based trap doesn't fight focus that moves into CDK overlay panels (dropdowns, menus, mention and emoji pickers, tooltips), which render outside the dialog in the overlay container. Rejected: migrating to CDK `Dialog` / `DialogService` (rewrites how all 15 dialogs are opened and wired, far beyond a fix), native `<dialog>` with `showModal()` (its own Esc handling clashes with `EscapeService`, its top layer hides CDK overlays opened from inside, and it needs the overlay CSS redone), and `ConfigurableFocusTrap` with the event-listener strategy (it pulls focus back from CDK overlay panels, which would break dropdowns inside dialogs).
2. **Roles: `alertdialog` for `ConfirmDialogComponent` and `EditConflictDialogComponent`, `dialog` for the rest** (2026-11-04). Reason: WAI-ARIA APG reserves alertdialog for interrupting messages that need a response, which is exactly those two. They have no title, so the message is their label. Rejected: `alertdialog` for the delete-folder and delete-project dialogs. They are titled forms with choices, not bare interrupts.
3. **`aria-modal="true"` without making the background `inert`** (2026-11-04). Reason: WCAG 4.1.2 and APG are met by `aria-modal` plus the focus trap. `inert` on the app root would also disable the nested confirm dialogs, which render inside the popups, and the CDK overlay container. Rejected: toggling `inert` on siblings, which is fragile with nested dialogs and gives no extra benefit over the trap.
4. **Initial-focus rules** (2026-11-04). Reason: APG dialog pattern and WCAG 2.4.3 Focus Order. Small dialogs focus their first field, so the user can type right away. Dialogs whose main action is destructive (`ConfirmDialogComponent`, `DeleteFolderDialogComponent`) focus *Cancel*, so a habitual Enter never deletes (Impeccable harden.md, error prevention; Nielsen #5). Content popups (item, ticket, attachment preview) focus the panel, so the screen reader reads the name and Tab starts at the first control without popping an icon tooltip or putting a caret in a field. The edit-conflict dialog has no safe default (*Load latest* drops the draft, *Overwrite* drops the other person's edit), so it focuses its panel. Rejected: always the first tabbable element (that would be *Close* in project settings and the favourite star in item popups) and always the panel (it adds a Tab before typing in single-field dialogs).
5. **Focus follows mode switches in item popups** (2026-11-04). Reason: clicking *Edit*, *Save* or *Cancel* removes the clicked button, which drops focus to `<body>` and lets Tab escape. WCAG 2.4.3. Re-running `focusInitialElementWhenReady()` reuses the same `cdkFocusInitial` markers, so no new mechanism is needed.
6. **Menu-opened dialogs return focus to the menu trigger** (2026-11-04). Reason: the menu option that opened the dialog is destroyed before the dialog captures focus, so without this every row-action dialog returns focus to `<body>`. WCAG 2.4.3. Focusing the trigger in `pick()` before emitting is the smallest change. Rejected: passing an explicit "return focus to" element into every dialog, which needs a new input on 15 components.
7. **Ids from a tiny `uniqueId` helper** (2026-11-04). Reason: several instances of the same dialog never coexist today, but a pure counter is safer than fixed ids and costs nothing. Rejected: CDK's `_IdGenerator`, a private underscore API that may change without notice.
8. **`cdkFocusInitial` on `app-button` through a new `initialFocus` input** (2026-11-04). Reason: CDK accepts a non-focusable host and redirects to its first tabbable child, but logs a dev-mode warning each time. An input on the shared button keeps the console clean and the intent readable. Rejected: wrapping the button in a focusable element, which would add an extra tab stop.
9. **Panel `:focus` outline suppressed only for `[role=dialog|alertdialog][tabindex='-1']`** (2026-11-04). Reason: the panel is a programmatic focus target, not an interactive control, so WCAG 2.4.7 applies to the controls inside, which keep their rings. A ring around the whole panel on every open would read as an error state (Impeccable operate.md: state colour only where it means state).

Decisions to double-check: none. This fix changes no business logic, data model or permissions.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures.

### A. Shared building blocks
- [ ] A1. Add `frontend/src/app/utils/uniqueId.ts` exporting `uniqueId(prefix: string): string` (module-level counter, returns `` `${prefix}-${n}` ``), with `uniqueId.spec.ts` checking that two calls with the same prefix return different ids that both start with the prefix.
- [ ] A2. Add `@Input() initialFocus = false` to `components/button/button.component.ts` and bind `[attr.cdkFocusInitial]="initialFocus ? '' : null"` on the inner `<button>` in `button.component.html`.
- [ ] A3. In `frontend/src/styles.css`, right after the `.popupPanel` rules, add the `[role='dialog'][tabindex='-1']:focus, [role='alertdialog'][tabindex='-1']:focus { outline: none; }` rule.
- [ ] A4. In `components/menu-button/menu-button.component.ts`, add a private `focusTrigger()` that focuses the first focusable element inside `.menuButton__origin` (Part 2.2). Call it at the start of `pick()`, and in the panel's Esc handler before `close()` (move the template's inline `close(); $event.preventDefault()` into a `handlePanelEscape(event)` method). Add `menu-button.component.spec.ts` (TestBed, `provideTranslateService()`): open the menu, click an option, and expect `document.activeElement` to be the trigger and `picked` to have emitted.

### B. Small dialogs
- [ ] B1. `confirm-dialog`: import `CdkTrapFocus`, add `messageId = uniqueId('confirmDialog')`, apply the pattern with `role="alertdialog"` labelled by the message, and put `[initialFocus]="true"` on the *Cancel* button. Add `confirm-dialog.component.spec.ts` (TestBed): the panel has `role="alertdialog"`, `aria-modal="true"` and `aria-labelledby` pointing at the message's id; after `await fixture.whenStable()` the Cancel `<button>` is `document.activeElement`; with a button outside the dialog focused before creation, destroying the fixture returns focus to it.
- [ ] B2. `edit-conflict-dialog`: same pattern as B1 with `role="alertdialog"` labelled by its message, and `cdkFocusInitial` on the panel. Keep the existing spec passing.
- [ ] B3. `create-named-item-dialog`: pattern with `role="dialog"` labelled by the title. Replace `autofocus` on the input with `cdkFocusInitial` and add `[attr.aria-labelledby]="titleId"` to it. Extend its spec so that after `whenStable()` the input is focused. Check in the running app that `create-chat-channel-dialog` and `chat-channel-settings-dialog` inherit this without changes.
- [ ] B4. Apply the pattern to `template-picker-dialog`, `board-picker-dialog`, `move-to-board-dialog`, `delete-project-dialog` and `folder-project-dialog` (title-labelled, default initial focus). Keep their existing specs passing.
- [ ] B5. `delete-folder-dialog`: pattern, plus `[initialFocus]="true"` on *Cancel*.
- [ ] B6. `new-project-dialog` and `project-settings-dialog`: pattern, plus `cdkFocusInitial` on the name `<input>` in `components/project-form/project-form.component.html`. Keep the `project-form`, `new-project-dialog` and `project-settings-dialog` specs passing.
- [ ] B7. `attachment-preview`: pattern labelled by `.attachmentPreview__name` (give it the id), with `cdkFocusInitial` on the panel.

### C. Content popups
- [ ] C1. `item-detail-layout`: `cdkTrapFocus [cdkTrapFocusAutoCapture]="true"` on `.itemDetailOverlay`, and `role="dialog"`, `aria-modal="true"`, `tabindex="-1"` on `.itemDetail`. View mode: `aria-labelledby` the `h1` (give it `titleId`). Other modes: `aria-label` as in Part 2.2. Add `[attr.cdkFocusInitial]` on the panel for view mode and `cdkFocusInitial` on the title input. Add `@ViewChild(CdkTrapFocus)` and an `ngOnChanges` that refocuses on mode changes after the first.
- [ ] C2. Add `item-detail-layout.component.spec.ts` (TestBed, `provideTranslateService()`, `isTemplate=true`, `showSidebar=false` to avoid the favourite and sidebar services): in view mode the panel is focused after `whenStable()`; after setting `mode` to `'edit'` and `whenStable()` the title input is focused; the panel's name follows the mode (labelled by the `h1` in view, `aria-label` with the draft title in edit).
- [ ] C3. `pages/dashboard/ticket-detail`: trap on `.ticketDetailOverlay`, `role="dialog"`, `aria-modal`, `tabindex="-1"`, `aria-label` and `cdkFocusInitial` on `.ticketDetail`. Keep `ticket-detail.component.spec.ts` passing.

### Z. Wrap-up
- [ ] Z1. Update `CLAUDE.md` (Frontend → Components): one bullet describing the dialog pattern (`cdkTrapFocus` with auto-capture on the overlay; panel `role="dialog"` or `alertdialog`, `aria-modal`, `tabindex="-1"`, labelled through `uniqueId` from `@utils/uniqueId`; initial focus with `cdkFocusInitial` or `app-button [initialFocus]`; menu options return focus to their trigger), and mention `uniqueId` among the utils where it fits.
- [ ] Z2. Run `npm test` and `npm run build` in `frontend/` (no style budget errors). The backend is untouched; confirm `git diff --stat` shows no `backend/` changes.
- [ ] Z3. Manual check in the running app, keyboard only: open a page, press *Edit* (focus lands in the title), type, press Esc (focus lands on *Cancel* of "Discard unsaved changes?"), Tab cycles only inside the confirm, Esc returns focus to the editor. Open a ticket from Kanban (the panel is focused; Tab never reaches the board), close it with Esc (focus is back on the card). Open a folder's `…` menu → *Delete* (focus on *Cancel*), cancel (focus on the `…` trigger). Open a dropdown inside New project and check it still works. Check with VoiceOver that one dialog announces its role and name.
