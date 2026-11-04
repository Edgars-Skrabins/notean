# Accessible control names — Spec

**Type:** bug fix
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

Many Notean controls have no accessible name, or their name and selected state are exposed in a way assistive technology handles badly. Measured in the UX critique (2026-11-04) and a sweep of every template on master `f15abdf`:

- **Text fields named only by a placeholder, or not at all.** The Pages and Diagrams list searches, the Projects, Trash, List tab, template and board-template searches, the assignee and tag pickers' searches, the ticket and item title fields and the List tab's new-ticket field have only a placeholder. A placeholder disappears once you type and isn't a reliable name. Four inputs have no name at all: the item-tree rename field, the Kanban column rename field, the board title rename field and the diagram shape label field.
- **Editors without names.** The comment composer's rich-text editor (and the comment edit, diagram pin and page content editors) is a bare `contenteditable` with no role or name. The plain-text mention editor has a role, but its name is missing everywhere except the project description, whose `<label for>` points at a `div`, which `for` can't label.
- **Selection controls.** The profile's avatar colour swatches show their colour name only in a native `title` and expose no selected state. The theme mode switch and theme picker are sets of `aria-pressed` toggle buttons, so a screen reader hears nine independent toggles instead of one choice out of nine, and each option is a separate Tab stop.
- **Native `title` tooltips**, which CLAUDE.md forbids for icon-only controls: the rich-text toolbar buttons (which also don't expose whether bold, italic and so on are on), the team code copy button, the sidebar collapse toggle and the assignee avatar stack.

Expected behaviour after the fix:

- **Users:** screen-reader and voice-control users (who say a control's name to use it), and keyboard users moving through the theme and colour choices.
- **Usage:**
  - Every text field and editor has a stable name that matches its visible purpose: "Search pages by title", "Ticket title", "Rename column", "Write a comment", "Page content", "Description" and so on. Placeholders stay as they are.
  - The theme mode switch, theme picker and avatar colours are each a radio group: one Tab stop, arrow keys move the choice (previewing the theme or colour exactly as clicking does today), and the screen reader announces "Light, radio button, 2 of 3, selected". Clicking works as before and looks the same, with a focus ring on the option when it has keyboard focus.
  - Avatar colours show their name in the styled tooltip on hover and keyboard focus.
  - The rich-text toolbar buttons show the styled tooltip and announce "Bold, toggle button, pressed" while bold is on.
  - The team code copy button and the collapsed sidebar toggle show the styled tooltip. The avatar stack is announced as one image named with the people's nicknames ("Anna, Ben") and shows the same list in the styled tooltip.
- **Rules:** no behaviour changes apart from arrow keys now changing the choice in the three radio groups, which is the standard radio behaviour. Theme and colour changes are still previews until Save, as today.
- **Out of scope:**
  - Global search names and combobox semantics, which belong to `global-search-polish`.
  - Dialog names and the create-named-item dialog's name field, which belong to `dialog-accessibility`.
  - Contrast and visual clarity of the selected theme and mode, which belong to `theme-contrast`.
  - The folder row's truncation `title` in `item-tree`. It repeats visible text on a row with its own name, and the row belongs to `row-actions-keyboard-access`.
  - Read-only rich-text views (page view mode, comments). They are content, not controls, so they get no textbox role or name.

# Part 2 — Technical details

## 2.1 Tools and libraries

- Native `<input type="radio">` for the three single-choice groups, visually hidden with CDK's `.cdk-visually-hidden` class. That class comes from `node_modules/@angular/cdk/a11y-prebuilt.css`, which is added to both `styles` arrays in `frontend/angular.json` right after `overlay-prebuilt.css`.
- The existing `appTooltip` directive (`components/tooltip/`), which already shows on `:focus-visible` inside its host.
- Tiptap `editorProps.attributes` given as a function, so names can change after the editor is created.
- No new dependencies.

## 2.2 Structure

### Text inputs: add `[attr.aria-label]`

| File (`frontend/src/app/…`) | Input | Name (phrase) |
|---|---|---|
| `pages/dashboard/document-pages/document-pages.component.html` | `.pagesView__search` | `SEARCH_PAGES` |
| `pages/dashboard/diagrams/diagrams.component.html` | `.diagramsView__search` | `SEARCH_DIAGRAMS` |
| `pages/dashboard/projects/projects.component.html` | `.projects__search` | `SEARCH_PROJECTS` |
| `pages/dashboard/trash/trash.component.html` | `.trash__search` | `SEARCH_TRASH` |
| `pages/dashboard/list-tab/list-tab.component.html` | `.listTab__search` | `SEARCH_TICKETS` |
| `pages/dashboard/list-tab/list-tab.component.html` | `.listTab__createInput` | `TICKET_TITLE_PLACEHOLDER` |
| `components/template-list/template-list.component.html` | `.templateList__search` | `SEARCH_TEMPLATES` |
| `components/board-template-select/board-template-select.component.html` | `.boardTemplateSelect__search` | `SEARCH_TEMPLATES` |
| `components/ticket-assignees/ticket-assignees.component.html` | `.ticketAssignees__search` | `SEARCH_MEMBERS` |
| `components/ticket-tags/ticket-tags.component.html` | `.ticketTags__search` | `SEARCH_TAGS` |
| `pages/dashboard/ticket-detail/ticket-detail.component.html` | `.ticketDetail__titleInput` | `TICKET_TITLE_PLACEHOLDER` |
| `components/item-detail-layout/item-detail-layout.component.html` | `.itemDetail__titleInput` | `titlePlaceholder` (already a phrase key) |
| `components/item-tree-row/item-tree-row.component.html` | `.itemTreeRow__renameInput` | `RENAME_ITEM` |
| `components/kanban-column/kanban-column.component.html` | `.kanbanColumn__titleInput` | `RENAME_COLUMN` |
| `pages/dashboard/board-page/board-page.component.html` | `.boardPage__titleInput` | `RENAME_BOARD` |
| `components/flowchart-editor/flowchart-editor.component.html` | `.flowchartEditor__labelInput` | new `DIAGRAM_LABEL` |

Each binding is `[attr.aria-label]="PHRASES.X | translate"`. The item-detail one is `[attr.aria-label]="titlePlaceholder | translate"`.

### Editors

- `components/rich-text-editor/rich-text-editor.component.ts`: new `@Input() ariaLabel = ''`. `editorProps.attributes` becomes a function returning `{role: 'textbox', 'aria-multiline': 'true', 'aria-label': this.ariaLabel}` while `this.editable` is true and `{role: 'presentation'}` otherwise (see decision 9; leave out `aria-label` when `ariaLabel` is empty). In `ngOnChanges`, when `ariaLabel` changes after creation, call `this.editor.setOptions({})` so ProseMirror recomputes the attributes. `setEditable` already triggers a view update for the `editable` case. Confirm both with the spec in C1.
- `rich-text-editor.component.html` toolbar buttons: replace `[title]` with `[appTooltip]` (same phrase) and add `[attr.aria-pressed]="isActive(...)"` with the same arguments as each button's `--active` class. Import `TooltipDirective`.
- `components/mention-text-editor/mention-text-editor.component.ts`: new `@Input() ariaLabel = ''`. `attributes` becomes a function returning the existing `id` / `role` / `aria-multiline` plus `'aria-label': this.ariaLabel || this.placeholder` (left out when both are empty). It re-runs on `ariaLabel` / `placeholder` changes through `setOptions({})` in `ngOnChanges`, so the chat composer's "Message #channel" follows channel switches.
- Usages:

| File | Editor | `ariaLabel` |
|---|---|---|
| `components/comment-list/comment-list.component.html` | new comment | new `WRITE_COMMENT` |
| `components/comment-item/comment-item.component.html` | edit comment | `EDIT_COMMENT` |
| `components/diagram-comment-layer/diagram-comment-layer.component.html` | pin composer | `WRITE_COMMENT` |
| `pages/dashboard/page-detail/page-detail.component.html` | the `[editable]="true"` editor | new `PAGE_CONTENT` |
| `pages/dashboard/template-detail/template-detail.component.html` | the `[editable]="true"` editor | `PAGE_CONTENT` |
| `pages/dashboard/ticket-detail/ticket-detail.component.html` | description | new `TICKET_DESCRIPTION` |
| `components/project-form/project-form.component.html` | description | `PROJECT_DESCRIPTION` |
| `components/chat-message/chat-message.component.html` | edit message | new `EDIT_MESSAGE` |
| `components/chat-composer/chat-composer.component.html` | composer | none, falls back to its "Message #name" placeholder |

### Radio groups

- `components/theme-mode-switch/theme-mode-switch.component.html`: the container becomes `role="radiogroup"` (keeping its `aria-label`). Each option becomes `<label class="themeModeSwitch__option" [class.themeModeSwitch__option--active]="...">` holding `<input type="radio" class="cdk-visually-hidden" name="themeMode" [value]="option.mode" [checked]="option.mode === mode" (change)="select(option.mode)">` followed by the text. CSS: the option gets `display: inline-flex; align-items: center` so it keeps the button's `min-height`, and `:focus-visible` becomes `:has(:focus-visible)`.
- `components/theme-picker/theme-picker.component.html`: the same, with `name="theme"`. `.themePicker__card` becomes the `<label>`, the radio is its first child and the preview and name follow unchanged. CSS: `.themePicker__card:focus-visible` becomes `.themePicker__card:has(:focus-visible)`, and `display` is set if the label doesn't already lay out like the button did.
- `pages/dashboard/profile/profile.component.html`: the colour label `<span>` gets `id="avatarColorLabel"`, and `.profile__swatches` gets `role="radiogroup" aria-labelledby="avatarColorLabel"`. Each swatch becomes `<label class="profile__swatch" [class.profile__swatch--selected]="..." [style.background]="color.hex" [appTooltip]="color.phrase | translate">` holding `<input type="radio" class="cdk-visually-hidden" name="avatarColor" [value]="color.key" [checked]="color.key === pendingColor" [attr.aria-label]="color.phrase | translate" (change)="handleSelectColor(color.key)">`. The native `title` goes. CSS: add `.profile__swatch:has(:focus-visible) { outline: 2px solid var(--color-input-border-focus); outline-offset: 2px; }`. `ProfileComponent` imports `TooltipDirective`.
- Keep the existing modifier class names (`--active`, `--selected`) so `theme-contrast`'s styling of the selected state still applies.

### Native titles

- `components/team-code-display/team-code-display.component.html`: `[title]` becomes `[appTooltip]` with the same expression; import `TooltipDirective`.
- `components/dashboard-sidebar/dashboard-sidebar.component.html`: `[title]` on `.dashboardSidebar__toggle` becomes `[appTooltip]="collapsed ? (PHRASES.EXPAND_SIDEBAR | translate) : ''"`. Its visible label names it when expanded, so a tooltip is only needed when it is icon-only.
- `components/avatar-stack/avatar-stack.component.html`: `[title]="tooltip"` becomes `role="img" [attr.aria-label]="tooltip" [appTooltip]="tooltip"`; import `TooltipDirective`.

### New phrases

Add each key to `PHRASES` in `config/phrases.ts` and to every translation file, next to the related existing key (not at the end of the file):

| Key | Next to | en | lv | et | lt | ru | sv | fi | de | da | fr | es |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `WRITE_COMMENT` | `ADD_COMMENT` | Write a comment | Raksti komentāru | Kirjuta kommentaar | Rašyti komentarą | Напишите комментарий | Skriv en kommentar | Kirjoita kommentti | Kommentar schreiben | Skriv en kommentar | Écrire un commentaire | Escribe un comentario |
| `PAGE_CONTENT` | `PAGE_TITLE_PLACEHOLDER` | Page content | Lapas saturs | Lehe sisu | Puslapio turinys | Содержимое страницы | Sidans innehåll | Sivun sisältö | Seiteninhalt | Sidens indhold | Contenu de la page | Contenido de la página |
| `TICKET_DESCRIPTION` | `TICKET_DESCRIPTION_PLACEHOLDER` | Description | Apraksts | Kirjeldus | Aprašymas | Описание | Beskrivning | Kuvaus | Beschreibung | Beskrivelse | Description | Descripción |
| `DIAGRAM_LABEL` | `DIAGRAM_TITLE_PLACEHOLDER` | Label | Uzraksts | Silt | Etiketė | Подпись | Etikett | Nimiö | Beschriftung | Etiket | Libellé | Etiqueta |
| `EDIT_MESSAGE` | `MESSAGE_EDITED` | Edit message | Rediģēt ziņu | Muuda sõnumit | Redaguoti žinutę | Редактировать сообщение | Redigera meddelande | Muokkaa viestiä | Nachricht bearbeiten | Rediger besked | Modifier le message | Editar mensaje |

Before adding, compare each translation with the neighbouring keys in that file (for example how `EDIT_COMMENT` and `TICKET_DESCRIPTION_PLACEHOLDER` are worded) and match their tone and terms where they differ from the table.

### Parallel work

- `dialog-accessibility` edits `item-detail-layout.component.html` and `ticket-detail.component.html` (wrapper and panel attributes, `cdkFocusInitial` on the same title inputs) and `menu-button`. Keep both specs' attributes on the title inputs.
- `announced-status-messages` adds the same `a11y-prebuilt.css` line to `angular.json`. Identical additions merge cleanly; if a conflict shows, keep one copy. It also edits `project-form.component.html` (name input and error), while this spec only adds `ariaLabel` to the description editor there.
- `theme-contrast` restyles the selected state of `theme-picker` and `theme-mode-switch` and may touch the profile swatch ring. This spec keeps the `--active` / `--selected` class names and only changes the focus selectors and the label layout. Merge both CSS changes.
- `compact-comment-composer` restructures `comment-list.component.html` around the composer. Keep the `[ariaLabel]` binding on whatever `app-rich-text-editor` remains.
- `row-actions-keyboard-access` edits `item-tree-row` and `comment-item`; `list-tab-polish` edits `list-tab`; `kanban-card-readability` may edit `kanban-column`; `responsive-dashboard-shell` edits `dashboard-sidebar`; `manage-team-structure` may move `team-code-display`; `empty-states-guidance` may edit `flowchart-editor.component.html`; `account-pages-in-shell` moves Profile. This spec adds one attribute (or swaps `title` for `appTooltip`) on single elements in those files.

## 2.3 Decisions

1. **Explicit `aria-label` on every text field, keeping the placeholders** (2026-11-04). Reason: WCAG 4.1.2 Name, Role, Value and 3.3.2 Labels or Instructions. A placeholder isn't a reliable name and is gone once text is typed (Impeccable audit.md: "Form issues: inputs without labels"). The searches and rename fields have no room for a visible label in their compact toolbars and rows, and adding visible labels there would change the layout that other specs own. Rejected: visible `<label>`s everywhere (layout change across many screens) and relying on the placeholder as the name (inconsistent across screen readers and voice control).
2. **Names reuse existing phrases where one fits** (2026-11-04). Reason: the search placeholders ("Search pages by title") and rename phrases are already good names. Five new phrases cover the editors and the diagram label. Rejected: a second `*_LABEL` key per field, which duplicates text.
3. **Rich-text editors get `role="textbox"` + `aria-multiline` + `aria-label` only while editable** (2026-11-04). Reason: a `contenteditable` without a role is announced inconsistently, and the mention editor already uses this pattern, so both editors now match (Nielsen #4). Read-only views are content, and a textbox role there would wrongly invite typing.
4. **The mention editor falls back to its placeholder for the name** (2026-11-04). Reason: the chat composer's placeholder "Message #channel" is the right name and changes per channel. An explicit `ariaLabel` overrides it where the placeholder is only a hint ("Add a description…"). Rejected: requiring `ariaLabel` everywhere, which would duplicate the chat placeholder logic.
5. **Theme mode, theme and avatar colour become native radio groups** (2026-11-04). Reason: each is one choice out of several. WAI-ARIA APG's radio group gives one Tab stop, arrow-key movement and "n of m, selected" announcements. Native radios provide all of that with no custom key handling (Impeccable operate.md: "native expectations… reinventing standard affordances" is a product constraint). Arrow keys only preview, as clicks do today, so moving through options is safe. Rejected: keeping `aria-pressed` buttons (valid ARIA, but announced as independent toggles with nine Tab stops), `role="radio"` on buttons with a hand-written roving tabindex (custom code for what the platform does natively) and `aria-pressed` + `appTooltip` on the swatches only, as the critique suggested (it would leave the three single-choice pickers inconsistent with each other, Nielsen #4).
6. **Rich-text toolbar buttons get `aria-pressed`** (2026-11-04). Reason: they are toggles whose on/off state is shown only by a CSS class today (WCAG 4.1.2). Rejected: `role="toolbar"` on the bar, which promises arrow-key navigation the bar doesn't have.
7. **Native `title` becomes `appTooltip` on the toolbar, swatches, team code copy button, collapsed sidebar toggle and avatar stack** (2026-11-04). Reason: CLAUDE.md requires styled tooltips plus `aria-label` for icon-only controls, never `title`. A native `title` never shows on keyboard focus or touch. The avatar stack isn't focusable, so it also gets `role="img"` and an `aria-label`, so the names reach screen readers.
8. **Visually hidden radios use CDK's `.cdk-visually-hidden` from `a11y-prebuilt.css`** (2026-11-04). Reason: the brief prefers CDK a11y, and the same stylesheet is needed by `LiveAnnouncer` in `announced-status-messages`, so the project gains one shared visually-hidden class instead of a home-made one. Rejected: a custom `.visuallyHidden` class in `styles.css` (a second class for the same job).
9. **Read-only rich-text views get `role="presentation"`** (2026-11-04, during C1). Reason: Tiptap 3 always adds `role="textbox"` to the editor element and merges `editorProps.attributes` over it, so a read-only view can't leave the role out; until now page view mode and comments were announced as text boxes. `presentation` overrides it with no role, so the view reads as plain content, which is what decision 3 asks for. Rejected: removing the attribute from the DOM after each ProseMirror update (fragile, ProseMirror re-applies it) and `role="document"` (adds a landmark-like boundary inside the page).
10. **Each radio option label gets `position: relative`** (2026-11-04, during D1). Reason: `.cdk-visually-hidden` is `position: absolute; left: 0`, so without a positioned label the hidden radio sits at the left edge of a distant ancestor, and focusing it with the arrow keys can scroll the page sideways. The swatch label also gets `display: block` so it keeps the button's size.

Decisions to double-check: none. These are markup-only fixes with no business logic, data or permission changes.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures.

### A. Setup and phrases
- [x] A1. Add `node_modules/@angular/cdk/a11y-prebuilt.css` after `overlay-prebuilt.css` in both `styles` arrays of `frontend/angular.json`.
- [x] A2. Add `WRITE_COMMENT`, `PAGE_CONTENT`, `TICKET_DESCRIPTION`, `DIAGRAM_LABEL` and `EDIT_MESSAGE` to `config/phrases.ts` and to all 11 files in `frontend/public/assets/translations/`, each next to the key named in Part 2.2.

### B. Text inputs
- [x] B1. Add the `[attr.aria-label]` bindings from the text-input table in Part 2.2 to all 16 inputs. Afterwards, rerun the sweep (every `<input>`/`<textarea>` in `src/app/**/*.html` that isn't a radio, checkbox or file input has an `aria-label`, `aria-labelledby`, a wrapping `<label>` or a `<label for>`). The only exception left is the create-named-item dialog input, which `dialog-accessibility` labels.

### C. Editors
- [x] C1. `rich-text-editor`: the `ariaLabel` input, function `attributes`, `setOptions({})` on change, toolbar `appTooltip` + `aria-pressed`. Extend `rich-text-editor.component.spec.ts`: an editable editor's `.ProseMirror` has `role="textbox"`, `aria-multiline="true"` and the given `aria-label`; changing `ariaLabel` updates it; a read-only editor has `role="presentation"` and no `aria-multiline` or `aria-label`; the Bold button's `aria-pressed` is `"true"` after toggling bold and has no `title` attribute.
- [x] C2. `mention-text-editor`: the `ariaLabel` input with placeholder fallback and updates on change. Extend `mention-text-editor.component.spec.ts`: the explicit label wins, the placeholder is used without one, and a changed placeholder updates the name.
- [x] C3. Pass `ariaLabel` at every usage in the editor table in Part 2.2.

### D. Radio groups
- [x] D1. `theme-mode-switch`: radiogroup markup and CSS from Part 2.2. Update `theme-mode-switch.component.spec.ts`: three radios with exactly the current mode checked, and dispatching `change` on another radio emits `modeChange` with its mode.
- [x] D2. `theme-picker`: radiogroup markup and CSS. Update `theme-picker.component.spec.ts` (its `aria-pressed` assertions become `checked` radios): nine radios in order with only the selected theme checked; `change` on another emits `themeChange`.
- [x] D3. Profile avatar colours: radiogroup markup, `appTooltip`, CSS focus ring, `TooltipDirective` import. Keep `profile.component.spec.ts` passing, and check the style budget for `profile.component.css`.

### E. Native titles
- [x] E1. Swap `title` for `appTooltip` in `team-code-display` and `dashboard-sidebar` as described in Part 2.2.
- [x] E2. `avatar-stack`: `role="img"`, `aria-label` and `appTooltip`. Update `avatar-stack.component.spec.ts` so the nickname list is checked through `aria-label` and the element has no `title`.
- [x] E3. `grep -rn '\[title\]=\| title="' frontend/src/app --include='*.html'` now lists only `app-auth-card` / `app-favorite-star` / item `[title]` inputs and the `item-tree` folder row (out of scope).

### Z. Wrap-up
- [x] Z1. Update `CLAUDE.md` (Frontend → Components): text fields without a visible label get `[attr.aria-label]` (placeholders are not names); rich-text and mention editors take `ariaLabel` (the mention editor falls back to its placeholder); single-choice pickers use native radios hidden with `.cdk-visually-hidden` (from `a11y-prebuilt.css`, listed in the tech stack) inside a `role="radiogroup"`.
- [x] Z2. Run `npm test` and `npm run build` in `frontend/` (no style budget errors). The backend is untouched; confirm `git diff --stat` shows no `backend/` changes.
- [ ] Z3. Manual check in the running app with VoiceOver: Tab to the Pages search (hears "Search pages by title"), rename a folder (hears "Rename"), focus the comment composer (hears "Write a comment, edit text"), open Settings and use the arrow keys through the theme mode and themes (one Tab stop each, "n of m" announced, the preview follows, Save still needed), open Profile and arrow through the colours (the styled tooltip shows on keyboard focus), toggle Bold in the page editor (hears "pressed"), and hover an assignee avatar stack on a Kanban card (styled tooltip with names).
  - Not done yet (2026-11-04): the implementing session couldn't start a dev server (the desktop app's limit of 5 preview servers for this folder was used by other sessions), and VoiceOver needs a person. Frontend 987 specs pass and the build is clean. Left for the PR reviewer; tick it and delete this spec once it passes.
