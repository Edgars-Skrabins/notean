# Item title and heading hierarchy — Spec

**Type:** bug fix
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

Two related problems with headings.

**Visual.** In a page or diagram popup, the item title (`.itemDetail__title`, 20px, weight 700) looks exactly like a heading inside the content (the editor's `h2` is also 20px, 700), and a content `h1` is larger than the title (it falls back to the browser's `2em`, about 28px). Every built-in page template starts with an `<h1>` ("Meeting notes", "Feature name" …), so a page created from a template shows a content heading that outranks its own title. People cannot tell at a glance which line is the document's name.

**Structural.** The heading outline of the app is broken for assistive technology and for anyone who navigates by headings. Only the page/diagram popup (view mode) and the board page have an `h1`. Home, Projects, Trash, Chat, project detail, Settings, Profile, Manage team and Switch team use an `h2` as their title; the Pages, Diagrams and page/diagram Templates screens have no title heading at all; edit and create mode of the popups lose the `h1`; the sidebar's "Favorites" `h3` comes first in the DOM; and many sections skip a level (`h1` → `h3` in the popup sidebar, `h2` → `h4` on project detail).

**Expected behaviour:**

- The item title in the popup is clearly the largest, heaviest text on the screen, and content headings sit one step below it (content `h1` < title, `h2` < `h1`, `h3` < `h2`). The title input in edit and create mode uses the same size, so switching modes does not jump.
- Built-in page templates no longer start with an `<h1>`; the item title carries the document's name.
- Every dashboard and auth screen has exactly one `h1` (visible, or visually hidden where the screen already shows its name another way), section headings under it are `h2`, their sub-sections `h3`, without skipped levels.

**How to reproduce:** open a page created from "Meeting notes": the content heading "Meeting notes" is bigger than the page title. With a screen reader or a headings outline extension, open Home: there is no `h1`, and the first heading is the sidebar's "Favorites" (`h3`).

- **Users:** everyone reading pages and diagrams; keyboard and screen-reader users navigating by headings.
- **Usage:** purely presentational and semantic; no new interaction.
- **Rules:** no data, API or permission change. User-written content may still contain any heading level (the editor and the backend sanitiser are unchanged); only app-owned headings follow the one-`h1` rule.
- **Out of scope:**
  - Dialog titles (`create-named-item`, `template-picker`, `delete-folder`, `new-project` … dialogs keep their `h3`): `dialog-accessibility.spec.md` owns dialog semantics and labelling.
  - The global search panel's group headings (`global-search-polish.spec.md`).
  - Font family, weight tokens and theme changes (`theme-contrast.spec.md`).
  - Restricting the editor's heading levels or converting stored content.
  - Screen titles other than the item popup keep their current 20px look; only their tag changes.

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. Plain HTML heading elements, CSS tokens in `styles.css`, the read-only and editable `RichTextEditorComponent` (Tiptap StarterKit, all heading levels on, `ViewEncapsulation.None`).

## 2.2 Structure

### Type scale

Global font-size tokens live in `frontend/src/styles.css` `:root` (CLAUDE.md: "Font sizes and transitions stay global in styles.css"). Add two steps after `--font-xl: 20px`, following the existing naming:

```
--font-2xl: 24px;
--font-3xl: 28px;
```

Resulting roles (body text is `--font-md`, 14px):

| Role | Size | Weight | Line height | Other |
|---|---|---|---|---|
| Item title (popup view `h1` and title input) | `--font-3xl` 28px | 700 | 1.2 | `letter-spacing: -0.02em`, `text-wrap: balance`, `overflow-wrap: anywhere` |
| Content `h1` | `--font-2xl` 24px | 700 | 1.25 | margin `var(--space-5) 0 var(--space-2)` |
| Content `h2` | `--font-xl` 20px (unchanged) | 700 | 1.3 | margin unchanged |
| Content `h3` | `--font-lg` 16px | 700 | 1.35 | margin `var(--space-4) 0 var(--space-2)` |
| Content `h4`–`h6` | `--font-md` 14px | 700 | inherit | margin `var(--space-3) 0 var(--space-1)` |

The first child of the content never gets a top margin (`.richTextEditor__host .ProseMirror > :first-child { margin-top: 0; }`), so a heading at the top of a page sits directly under the title gap.

Files:

- `frontend/src/app/components/item-detail-layout/item-detail-layout.component.css`: `.itemDetail__title` and `.itemDetail__titleInput` take the item-title role above (the input keeps its padding, border and focus ring; add `line-height: 1.2` and the letter-spacing).
- `frontend/src/app/components/rich-text-editor/rich-text-editor.component.css`: add `h1`, `h3` and `h4, h5, h6` rules under `.richTextEditor__host` next to the existing `h2` rule, add `line-height: 1.3` to the `h2` rule, and the first-child rule. The stylesheet is about 2.3 kB; the additions must keep it under the 4 kB error budget (it already exceeds the 2 kB warning).

### Built-in page templates

- `frontend/src/app/config/builtInTemplates.ts`: remove the leading `<h1>…</h1>` entry from `FEATURE_DOCUMENTATION`, `MEETING_NOTES`, `CONCEPT` and `PERFORMANCE_IMPROVEMENT_PLAN`. Each now starts with its metadata paragraph or first `<h2>`.
- `frontend/src/app/config/builtInTemplates.spec.ts`: "ships the page templates as HTML documents" expects each page template to start with `<p>` or `<h2>` and to contain no `<h1`.

### One `h1` per screen

Visually hidden headings use CDK's `.cdk-visually-hidden` class from `node_modules/@angular/cdk/a11y-prebuilt.css`. Add that stylesheet to both `styles` arrays in `frontend/angular.json` (build and test), right after `overlay-prebuilt.css`, unless it is already there. `announced-status-messages` and `accessible-control-names` add the same line, so identical additions merge cleanly. No custom class is added to `styles.css` (decided 2026-11-04 to keep one visually hidden class across the parallel specs).

Heading changes (tag only, classes unchanged, so no visual change unless noted):

| Screen / component | File (`frontend/src/app/…`) | Change |
|---|---|---|
| Sidebar favourites | `components/favorites-list/favorites-list.component.html` | `h3` → `h2` |
| Home | `pages/dashboard/home/home.component.html` | title `h2` → `h1` |
| Home sections | `components/activity-inbox/activity-inbox.component.html`, `components/favorites-grid/favorites-grid.component.html`, `components/my-work/my-work.component.html` | `h3` → `h2` |
| Projects, Trash | `pages/dashboard/projects/projects.component.html`, `pages/dashboard/trash/trash.component.html` | title `h2` → `h1` |
| Chat | `pages/dashboard/chat-page/chat-page.component.html` | title `h2` → `h1` |
| Project detail | `pages/dashboard/project-detail/project-detail.component.html` | name `h2` → `h1`; "Project items" and "Members" `h3` → `h2`; group titles `h4` → `h3` |
| Pages, Diagrams | `pages/dashboard/document-pages/document-pages.component.html`, `pages/dashboard/diagrams/diagrams.component.html` | add `<h1 class="cdk-visually-hidden">` with `PHRASES.DOCUMENT_PAGES` / `PHRASES.DIAGRAMS` before `app-item-tabs` |
| Page / diagram templates | `pages/dashboard/templates/templates.component.html` | add `<h1 class="cdk-visually-hidden" *ngIf="itemKind">` with `PHRASES.TEMPLATES` (board templates already have a visible `h1`) |
| Template list groups | `components/template-list/template-list.component.html` | the two group labels become `<div class="templateList__group capsLabel" role="heading" [attr.aria-level]="headingLevel">`; new `@Input() headingLevel: 2 \| 3 = 3` in `template-list.component.ts`; `templates.component.html` passes `[headingLevel]="2"`; the picker dialog keeps the default `3`, under its `h3` title |
| Page / diagram / template popup | `components/item-detail-layout/item-detail-layout.component.html` / `.ts` | view mode keeps `<h1 class="itemDetail__title">`; edit mode adds `<h1 class="cdk-visually-hidden">{{ item.title }}</h1>`; create mode adds `<h1 class="cdk-visually-hidden">{{ createHeading \| translate }}</h1>` with a new `@Input() createHeading = ''` (rendered only when set); the title input gets `[attr.aria-label]="titlePlaceholder \| translate"` |
| Popup callers | `pages/dashboard/page-detail/page-detail.component.html`, `pages/dashboard/diagram-detail/diagram-detail.component.html`, `pages/dashboard/template-detail/template-detail.component.html` | pass `[createHeading]="PHRASES.NEW_PAGE"`, `PHRASES.NEW_DIAGRAM`, `PHRASES.NEW_TEMPLATE` (add `PHRASES` to the component if missing) |
| Popup sidebar | `components/item-detail-sidebar/item-detail-sidebar.component.html` | `h3` → `h2` (Owner, Contributors, Project, Created, Last edited) |
| Attachments, comments | `components/attachment-list/attachment-list.component.html`, `components/comment-list/comment-list.component.html` | `h3` → `h2` (both sit under a screen `h1`: the item title, or the board title for the ticket popup) |
| Ticket popup fields | `pages/dashboard/ticket-detail/ticket-detail.component.html` (Priority), `components/ticket-assignees/ticket-assignees.component.html`, `components/ticket-tags/ticket-tags.component.html` | `h3` → `h2`, so they sit at the same level as Attachments and Comments under the board's `h1` |
| Board template detail | `pages/dashboard/board-template-detail/board-template-detail.component.html` | when `canEdit`, add `<h1 class="cdk-visually-hidden">` with `title` or, when empty, `PHRASES.NEW_TEMPLATE`; `components/template-rows/template-rows.component.html` `h3` → `h2` |
| Settings, Profile | `pages/dashboard/settings/settings.component.html`, `pages/dashboard/profile/profile.component.html` | title `h2` → `h1`; section `h3` → `h2` |
| Manage team | `pages/manage-team/manage-team.component.html` | title `h2` → `h1`; section `h3` → `h2` |
| Switch team | `pages/switch-team/switch-team.component.html` | title `h2` → `h1` |
| Auth card screens (login, register, create team, join team, team selection, unavailable) | `components/auth-card/auth-card.component.html` | `.authCard__title` `h2` → `h1` |

Unchanged: board page `h1` and its tab headings (Overview `h2`, List groups `h2`), the board templates screen `h1`, the global search headings, dialog titles.

Element selectors: none of the component stylesheets above style headings by element name (only `rich-text-editor.component.css` does), and `styles.css`' global `h1, …, h6` rule sets the same family and weight for all levels, so the tag swaps do not change the look. Browser default heading margins and sizes are overridden by each class; if any class lacks `margin` or `font-size`, add the current computed value to that class so the swap is visually neutral.

### Parallel work

These specs edit the same templates; keep this spec's change to the tag (or the added hidden `h1`) and theirs together when merging:

- `create-flow-opens-item.spec.md`: adds `#titleInput`, `autofocusTitle` and `cdkFocusInitial` on the same title input in `item-detail-layout`, and changes `template.service.spec.ts` to compare built-in content by equality (so the `<h1>` removal does not break it). If that spec is not merged yet, `template.service.spec.ts`' `toContain('Meeting notes')` fails after the `<h1>` removal (the string only appears in that heading), so this spec switches the assertion to equality with `builtInTemplate('page', 'meeting-notes')!.content`, the same change `create-flow-opens-item` makes.
- `dialog-accessibility.spec.md`: owns the `item-detail-layout` and ticket popup shells (dialog role, labelling, focus). Its `aria-labelledby` may point at the popup's `h1`; the hidden `h1` in edit and create mode gives it a target in every mode.
- `account-pages-in-shell.spec.md`: moves Settings, Profile and Manage team into the dashboard shell and may remove their "Back to dashboard" controls in the same templates. Each must still have exactly one `h1`.
- `manage-team-structure.spec.md`: restructures `manage-team.component.html` into sections. If it lands first, apply the rule to its new structure (page title `h1`, sections `h2`, sub-sections `h3`) instead of the line edits above.
- `empty-states-guidance.spec.md`: edits the Home sections' empty states (`activity-inbox`, `favorites-grid`, `my-work`); this spec only changes their title tags.
- `board-overview-focus.spec.md`: restructures the board Overview; its headings stay `h2` under the board `h1`, sub-groups `h3`.
- `ticket-status-control.spec.md`: adds a Status field to the ticket popup sidebar; its label should be an `h2` like Priority after this spec.
- `announced-status-messages.spec.md` (login/register forms) and `quiet-dashboard-background.spec.md` (auth-card CSS): this spec only changes the `authCard__title` tag in `auth-card.component.html`.
- `styles.css`: add `--font-2xl` / `--font-3xl` right after `--font-xl` and add `a11y-prebuilt.css` to `angular.json` (see Part 2.2).

## 2.3 Decisions

1. **How should the item title differ from content headings?** (2026-11-04) Size and spacing: 28px title, content `h1` 24px, `h2` 20px, `h3` 16px, body 14px. Reason: Impeccable typeset.md "Can heading, body, label, metadata, and data roles be distinguished at a glance? Are adjacent sizes or weights too close to carry different jobs?"; operate.md "Tighter scale ratio. 1.125–1.2 between steps" (28/24 ≈ 1.17, 24/20 = 1.2). Rejected: making content headings lighter or muted only (still competes on size); a decorative rule under the title (decoration instead of hierarchy, craft-floor).
2. **Same size for the title input?** (2026-11-04) Yes. Reason: Impeccable polish.md "Keep same-role typography consistent" across states; no jump between view and edit.
3. **Does the new title size apply to other screen titles?** (2026-11-04) No; Home, Projects, board name and the rest keep 20px. Reason: a document title heads long-form content with its own headings beneath, while screen titles head controls (Impeccable operate.md: product UI keeps a tight, fixed scale). Rejected: one 28px `h1` style everywhere (loud on dense Operate screens).
4. **New tokens or literal sizes?** (2026-11-04) Two new global tokens, `--font-2xl` and `--font-3xl`, following the existing `--font-xs…xl` naming. Reason: CLAUDE.md keeps font sizes global in `styles.css`; Impeccable polish.md "Promote genuinely reusable values to tokens". Rejected: role-named tokens (`--font-title`), which would break the file's existing naming convention.
5. **What about `<h1>` in content?** (2026-11-04) Keep it possible (no editor or sanitiser change), style it one step below the title, and remove it from the built-in page templates. Reason: the item title already carries the document name, and template titles now prefill it (`create-flow-opens-item.spec.md`); restricting heading levels would silently turn existing and pasted `h1`s into paragraphs. Rejected: limiting Tiptap to levels 2–3 (data change); demoting content headings at render time (custom heading node, out of proportion).
6. **One `h1` per screen, visible or hidden?** (2026-11-04) Visible where the screen already shows a title; visually hidden on Pages, Diagrams and their Templates tabs (whose tab bar already names the screen) and in the popups' edit and create modes (where the name is an input). Reason: WCAG 1.3.1 info and relationships and 2.4.6 headings and labels; no duplicated visible text. Rejected: a visible "Pages" title above the tabs (duplicates the active tab); no `h1` on those screens (status quo).
7. **Sidebar heading level?** (2026-11-04) `h2`. Reason: it is a section of the navigation, not a child of the screen title; `h2` before the main `h1` in DOM order is a valid outline (the main `h1` still names the screen), and keeping it a heading preserves heading navigation to Favorites. Rejected: removing the heading (loses navigation); leaving `h3` (skips a level).
8. **Template list group headings?** (2026-11-04) `role="heading"` with `aria-level` from a `headingLevel` input (2 on the Templates screen, 3 in the picker dialog). Reason: the same component renders under an `h1` on the screen and under an `h3` dialog title; ARIA allows a dynamic level where a fixed tag cannot fit both. Rejected: two template branches with `h2` / `h3` tags (duplicated markup); a fixed `h2` (wrong order in the dialog).
9. **Ticket popup field headings?** (2026-11-04) `h3` → `h2`, matching Attachments and Comments, which are shared with the page popup and become `h2`. Reason: otherwise Priority (`h3`) would read as a child of Comments (`h2`). Rejected: leaving the ticket popup out (would create that wrong nesting).
10. **Dialog titles?** (2026-11-04) Unchanged here. Reason: `dialog-accessibility.spec.md` owns them, and modal dialogs start their own outline once marked `aria-modal`. Rejected: retagging every dialog title in this spec (merge conflicts on the lines that spec edits).
11. **Title input name?** (2026-11-04) `aria-label` from the existing placeholder phrase. Reason: WCAG 4.1.2 / 2.5.3: a placeholder is not a reliable accessible name. No new phrase.
12. **Template list group label look after the tag change?** (2026-11-04) `.templateList__group` gets `font-family: var(--font-heading)` and `font-weight: var(--font-heading-weight)`, the values the global `h1…h6` rule gave the old `h3`, so the switch to a `div` with `role="heading"` is visually neutral. Reason: Part 2.2 asks for visually neutral swaps; the global heading rule no longer applies to a `div`.
13. **Where `.cdk-visually-hidden` is documented?** (2026-11-04) In CLAUDE.md next to the `styles.css` shared classes, noting it comes from CDK's `a11y-prebuilt.css` in `angular.json`, since no class is added to `styles.css` itself (Part 2.2).

### Decisions to double-check

- Decision 5 changes the content of the four built-in page templates (the leading heading disappears).
- Decision 9 retags the ticket popup's Priority, Assignees and Tags headings, an area `ticket-status-control.spec.md` and `dialog-accessibility.spec.md` also touch.
- The auth card's title becomes the screen's `h1` on login, register, create team, join team, team selection and unavailable.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Type scale and item title
- [x] A1. In `frontend/src/styles.css` add `--font-2xl: 24px` and `--font-3xl: 28px` right after `--font-xl`, and add `node_modules/@angular/cdk/a11y-prebuilt.css` to both `styles` arrays in `angular.json` if missing.
- [x] A2. In `frontend/src/app/components/item-detail-layout/item-detail-layout.component.css` give `.itemDetail__title` and `.itemDetail__titleInput` the item-title role from Part 2.2 (`--font-3xl`, 700, line-height 1.2, letter-spacing -0.02em; the title also `text-wrap: balance` and `overflow-wrap: anywhere`).
- [x] A3. In `frontend/src/app/components/rich-text-editor/rich-text-editor.component.css` add the content `h1`, `h3`, `h4, h5, h6` rules and the first-child rule, and add `line-height: 1.3` to the `h2` rule, as in Part 2.2. Keep the file under the 4 kB budget.
- [x] A4. In `frontend/src/app/config/builtInTemplates.ts` remove the leading `<h1>` line from the four page templates; update `frontend/src/app/config/builtInTemplates.spec.ts` to expect each page template to start with `<p>` or `<h2>` and contain no `<h1`. In `frontend/src/app/services/template.service.spec.ts` change the built-in resolve test's `toContain('Meeting notes')` to compare the content with `builtInTemplate('page', 'meeting-notes')!.content` (skip if `create-flow-opens-item` already did). Run `npm test` in `frontend/`.

### B. Popup headings
- [x] B1. In `frontend/src/app/components/item-detail-layout/item-detail-layout.component.ts` add `@Input() createHeading = ''`. In the template add the visually hidden `h1` for edit mode (`item.title`) and create mode (`createHeading | translate`, only when set), and `[attr.aria-label]="titlePlaceholder | translate"` on the title input.
- [x] B2. Pass `createHeading` from `page-detail.component.html` (`PHRASES.NEW_PAGE`), `diagram-detail.component.html` (`PHRASES.NEW_DIAGRAM`) and `template-detail.component.html` (`PHRASES.NEW_TEMPLATE`) in `frontend/src/app/pages/dashboard/…`.
- [x] B3. Retag `item-detail-sidebar`, `attachment-list`, `comment-list`, the ticket popup's Priority heading in `ticket-detail.component.html`, `ticket-assignees` and `ticket-tags` headings from `h3` to `h2` (files in the Part 2.2 table).
- [x] B4. Add a `TestBed` spec `frontend/src/app/components/item-detail-layout/item-detail-layout.component.spec.ts` (or extend it if `create-flow-opens-item` already added one) that renders the layout in view, edit and create mode and asserts exactly one `h1` each time, with the item title in view and edit mode and the create heading in create mode, and that the title input has an `aria-label`. Run `npm test`.

### C. Screen headings
- [x] C1. Retag the screen titles and their sections per the Part 2.2 table: favorites-list, home, activity-inbox, favorites-grid, my-work, projects, trash, chat-page, project-detail, settings, profile, manage-team, switch-team, auth-card, template-rows. Check each changed class still sets its own `margin` and `font-size` so the look does not change.
- [x] C2. Add the visually hidden `h1` to `document-pages.component.html`, `diagrams.component.html`, `templates.component.html` (only for `itemKind`) and `board-template-detail.component.html` (only when `canEdit`).
- [x] C3. In `frontend/src/app/components/template-list/` add `@Input() headingLevel: 2 | 3 = 3` and render the two group labels as `role="heading"` with `[attr.aria-level]="headingLevel"`; pass `[headingLevel]="2"` from `templates.component.html`. Update `template-list.component.spec.ts` if it queries the group labels by tag.
- [x] C4. Update any existing spec that queries a retagged heading by tag (search the `frontend/src/app` specs for `'h2'`, `'h3'`, `'h4'` in `querySelector` / `By.css`). Run `npm test`.

### D. Docs
- [x] D1. Update `CLAUDE.md`: in the Components section add a bullet that every screen has exactly one `h1` (visually hidden with `.cdk-visually-hidden` when the screen shows its name another way, e.g. the Pages tab bar or a title input), sections are `h2` and sub-sections `h3` without skipping levels, and dialogs keep their own title heading; list `.cdk-visually-hidden` among the shared classes in `styles.css`; in Themes note the `--font-2xl` / `--font-3xl` steps and that the item popup title uses `--font-3xl` above content headings.

### Z. Wrap-up
- [x] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test` and `npm run build` in `frontend/`); all component style budgets must pass.
- [x] Z2. Manual check in the running app: create a page from "Meeting notes": the title is clearly the largest text and no content heading outranks it; add `#`, `##`, `###` headings in the editor and check the steps in view and edit mode, in at least two themes (e.g. Purple haze dark and Paper light) with different heading fonts. With a headings outline tool (or the browser's accessibility tree), check Home, Projects, Pages, Diagrams, page Templates, a project, a board with an open ticket, Chat, Settings, Profile, Manage team, the page popup in view / edit / create mode, and the login screen: exactly one `h1` each and no skipped levels. Confirm nothing changed visually on the retagged screens.
