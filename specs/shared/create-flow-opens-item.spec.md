# Create flow opens the item — Spec

**Type:** feature
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

Creating a page or diagram today ends in the wrong place. The create popup (`/dashboard/pages/new`, `/dashboard/diagrams/new`) sends title, content, project and folder in one request on **Create**, then closes and returns to the list. The person who just wrote a page has to find it in the tree and open it again to see it, comment on it, favourite it or copy its link. An empty title is silently saved as "Untitled", and the person only finds out in the list. When the popup was opened from a template, only the content is filled in: the title stays empty although the template has a name. The title field is also not focused when the popup opens, so the person has to click into it before typing.

This spec changes the create flow for pages and diagrams so that:

1. **Create opens the created item** in the same popup, in view mode, instead of returning to the list.
2. **A template prefills the title** with the template's title, as well as the content.
3. **The title field is focused** when the create popup is ready, with any prefilled title selected, so typing replaces it and Tab keeps it.

- **Users:** any team member who creates a page or diagram from the Pages or Diagrams screen (toolbar "New page" / "New diagram", a folder's "+", "From template"), from the Templates tab ("Use template") or from a template's detail view ("Use template").
- **Usage:**
  1. The person opens the create popup. Once it is ready (immediately for a blank item; after the template has loaded when one was chosen), the title field has keyboard focus.
  2. With a template, the title field shows the template's title, selected. Typing replaces it; Tab or a click elsewhere keeps it. If the person already typed in the title field while the template was loading, their text is kept and the template title is not applied.
  3. The person edits title and content and presses **Create**. The button is disabled while the request runs (unchanged).
  4. On success, the popup stays open and shows the new item in **view mode**: its title as the heading, its content, the sidebar (owner, project, dates), the favourite star, *Copy link*, *Edit*, *Delete* and, for pages, comments. The URL becomes the item's own URL (`/dashboard/pages/:id` or `/dashboard/diagrams/:id`), replacing `…/new` in the browser history, so the browser's Back goes to the screen the person came from, not back into an empty create popup.
  5. An empty title is still saved as "Untitled" (the existing fallback), and the person now sees that title as the heading straight away and can change it with *Edit*.
  6. Closing the popup (×, Esc, backdrop) goes to the item's list, as it does for any opened item.
- **Error states:** a failed Create keeps the popup open in create mode with the draft and the error (unchanged). A template that fails to load still opens a blank draft with the error (unchanged); the title stays empty and focus goes to the title field once loading ends.
- **Rules:** no permission, data or API change. The create request is unchanged. Pending page attachments are claimed by the create request exactly as today.
- **Out of scope:**
  - Board creation and board templates (the sidebar create-board dialog), since boards have no create popup.
  - Template creation (`TemplateDetailComponent` in create mode) keeps its current behaviour; it is a different flow with its own back navigation.
  - Opening the new item in edit mode (see decision 2).
  - The split "New page" button (`new-item-split-button.spec.md`) and the title typography (`item-title-hierarchy.spec.md`).

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. Angular router, the existing `NavigationService`, `TemplateService`, `ItemDetailLayoutComponent` and `FolderedItemDetailComponent`.

## 2.2 Structure

### Template resolution returns the title

- `frontend/src/app/models/template.model.ts`: `TemplateContentResponse` becomes `Result<{ title: string; content: string }, TeamAccessErrorCode | TemplatesErrorCode>`.
- `frontend/src/app/services/template.service.ts` `resolve`: a built-in returns `{success: true, title: template.title, content: template.content}`; a team template returns `{success: true, title: response.template.title, content: response.template.content}`. Built-in titles come from `config/builtInTemplates.ts` (English, like the built-in content).

### Create opens the item

- `frontend/src/app/services/navigation.service.ts`: `navigateReplacingUrl(...routeSegments: AppRoutes[])` widens its parameter to `(AppRoutes | number)[]`, so an item id can be passed (`navigateReplacingUrl(AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, 9)`). Existing callers are unaffected.
- `frontend/src/app/pages/dashboard/foldered-item-detail.base.ts` `handleCreate`: on success, set `isCreated = true` (kept, `PageDetailComponent.ngOnDestroy` relies on it to keep claimed attachments) and call `this.navigationService.navigateReplacingUrl(AppRoutes.DASHBOARD, this.listRoute, response.item.id)`. The `…/new` and `…/:id` routes are different route configs, so Angular destroys the create instance and creates a fresh `PageDetailComponent` / `DiagramDetailComponent`, which loads the item through `GET` and connects the editing channel like any opened item. No navigation state is passed.
- The `createdItem` navigation state becomes unused and is removed: in `frontend/src/app/pages/dashboard/foldered-list-page.base.ts` delete the `createdItem` field, its assignment from `router.getCurrentNavigation()` in the constructor, `insertCreatedItem` and its call in `loadData`. The list now always shows what the server returns; a newly created item appears in its level like any other item.

### Title prefill

- `foldered-item-detail.base.ts` `loadTemplateContent`: on success set `draftContent = response.content` and, only when `draftTitle === ''`, `draftTitle = response.title`. `hasCreateDraftChanges` stays as is, so a prefilled title counts as a change (the discard question appears on close, as it already does for prefilled content).

### Title focus

- `frontend/src/app/components/item-detail-layout/item-detail-layout.component.ts`:
  - New `@Input() autofocusTitle = false`.
  - `#titleInput` template reference on the title `<input>`, read with `@ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>`.
  - Implement `OnChanges`: when `autofocusTitle` changes to `true`, `setTimeout(() => { input.focus(); input.select(); })` on `this.titleInput?.nativeElement` (the same `setTimeout` focus-and-select pattern as `ItemTreeRowComponent`'s rename input).
- `item-detail-layout.component.html`: the title input gets `#titleInput` and `[attr.cdkFocusInitial]="autofocusTitle ? '' : null"`, so a CDK focus trap added later picks the title as initial focus.
- `page-detail.component.html` and `diagram-detail.component.html` bind `[autofocusTitle]="mode === 'create' && !isLoading"`. Without a template this is `true` from the first change; with a template it turns `true` when the template has loaded (or failed), which focuses and selects the prefilled title.
- `TemplateDetailComponent` does not bind it (stays `false`).

### Parallel work

- `dialog-accessibility.spec.md` owns the item-detail-layout popup's dialog semantics, focus trap and focus restore. This spec only adds `autofocusTitle`, `#titleInput` and the `cdkFocusInitial` attribute on the title input. Whichever lands second keeps both: in create mode the initial focus is the title input; otherwise the trap's own initial focus applies.
- `item-title-hierarchy.spec.md` also edits the title input and the `<h1>` in `item-detail-layout.component.html` (adds `aria-label`, a visually hidden `<h1>` in edit and create mode, new font sizes), and removes the leading `<h1>` from the built-in page templates. Keep both sets of attributes on the input when merging.
- `new-item-split-button.spec.md` edits the toolbar and folder "+" in `document-pages`, `diagrams` and `item-tree` templates; this spec does not touch those templates.
- `trash-undo-without-confirm.spec.md` changes the delete flow in `foldered-item-detail.base.ts` (`handleDelete` / `handleConfirmDelete`); this spec only changes `handleCreate` and `loadTemplateContent` there.
- `empty-states-guidance.spec.md` adds an empty diagram view-mode hint; a just-created blank diagram now lands on that view, which is intended.

## 2.3 Decisions

1. **Where does Create land?** (2026-11-04) In the created item, in the same popup, in view mode. Reason: Nielsen #1 visibility of system status and #4 consistency: *Save* in edit mode already stays in the popup and switches to view mode, so Create behaves the same; the person sees what was saved, including an "Untitled" fallback title, and can favourite, link or comment at once. Impeccable polish.md: "Ensure arrival, transition, empty, and recovery paths connect instead of behaving as isolated screens." Rejected: returning to the list with the item highlighted (still a detour to reopen it); a toast with an "Open" action (extra step for the common case).
2. **View mode or edit mode after Create?** (2026-11-04) View mode. Reason: Create is a commit like Save, and Save ends in view mode (Nielsen #4); starting in edit mode would immediately open an editing-presence session and show other people "being edited by" for an item nobody else has seen yet. *Edit* is one click away. Rejected: edit mode via `?edit=true`.
3. **Browser history after Create?** (2026-11-04) Replace `…/new` with the item URL (`replaceUrl`). Reason: Back should never reopen an empty create popup for something already created (Nielsen #3 user control, #5 error prevention against accidental duplicates). Rejected: a normal push.
4. **How does the item load after Create?** (2026-11-04) The new route instance loads it with `GET`, like any opened item. Reason: the detail needs contributors, attachments and editing presence that the opened-item path already handles; one extra request on an explicit action is acceptable. Rejected: passing the created detail through navigation state (a second load path to keep in sync).
5. **What happens to the list's `createdItem` insertion?** (2026-11-04) Removed. Reason: it only existed because Create returned to the list; nothing passes it any more, and the list loads fresh when the person closes the item. Rejected: threading the created item through the item view and back to the list (complexity for an edge case of a new item beyond the first 50 of its level, which "Load more" already covers).
6. **Template title prefill?** (2026-11-04) Prefill the title with the template's title when the title is still empty; never overwrite text the person typed while the template loaded. Reason: Nielsen #6 recognition over recall and #7 efficiency: the template name is a reasonable starting title and is one keystroke to replace. Rejected: leaving the title empty (status quo, the critique's finding); prefixing with a date (invented business logic).
7. **Is a prefilled title a draft change?** (2026-11-04) Yes, like prefilled template content today, so closing asks before discarding. Reason: consistency with the existing content rule and protection of any edits on top of it. Rejected: ignoring prefilled values in `hasCreateDraftChanges` (would need to remember template values separately).
8. **Focus behaviour?** (2026-11-04) Focus the title input when the create popup is ready and select its text. Reason: Impeccable operate.md favours keyboard support and known patterns; selecting a prefilled value is the standard "type to replace, Tab to keep" pattern already used by the inline rename (`ItemTreeRowComponent`). Waiting for the template avoids focus landing before the prefilled title arrives. Rejected: focusing the content editor (the title comes first in reading and tab order); focusing in edit mode as well (people usually edit content, and edit mode is out of this spec's scope).
9. **Empty title on Create?** (2026-11-04) Keep the existing "Untitled" fallback. Reason: opening the created item makes the fallback visible immediately, which resolves the "silently Untitled" finding without blocking fast creation. Rejected: disabling Create until a title is typed (an extra gate for a reversible choice, Impeccable operate.md "consistency over surprise" with today's flow).
10. **How to navigate with an id?** (2026-11-04) Widen `NavigationService.navigateReplacingUrl` to accept numbers. Reason: smallest change that keeps routes built from `AppRoutes` (CLAUDE.md: use the enum, never string literals). Rejected: injecting `Router` into the base class (changes every subclass constructor and spec).

### Decisions to double-check

- Decision 5 removes the `createdItem` navigation state described in `CLAUDE.md`. A new item created inside a large level now shows up through the normal level loading only.
- Decision 6 uses built-in template titles, which are English only (like their content), as the item title regardless of the UI language.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Template title in resolve
- [x] A1. In `frontend/src/app/models/template.model.ts` change `TemplateContentResponse` to carry `title` next to `content`. In `frontend/src/app/services/template.service.ts` `resolve`, return the built-in's `title` and the team template's `title` with the content.
- [x] A2. Update `frontend/src/app/services/template.service.spec.ts`: the built-in case expects `title: 'Meeting notes'` and the content equal to `builtInTemplate('page', 'meeting-notes')!.content` (not a substring check, so it survives the built-in content changes in `item-title-hierarchy.spec.md`); the team-template case expects `{success: true, title: <raw title>, content: '<p>Went well</p>'}`. Run `npm test` in `frontend/`.

### B. Create opens the created item
- [x] B1. In `frontend/src/app/services/navigation.service.ts` widen `navigateReplacingUrl` to `...routeSegments: (AppRoutes | number)[]`.
- [x] B2. In `frontend/src/app/pages/dashboard/foldered-item-detail.base.ts` `handleCreate`, replace the `navigateWithState({createdItem}, …)` call (and the `createdItem` object it builds) with `this.navigationService.navigateReplacingUrl(AppRoutes.DASHBOARD, this.listRoute, response.item.id)`, keeping `this.isCreated = true` before it.
- [x] B3. In `frontend/src/app/pages/dashboard/foldered-list-page.base.ts` remove the `createdItem` field, its constructor assignment from `router.getCurrentNavigation()`, `insertCreatedItem` and its call in `loadData`. Drop any import that becomes unused.
- [x] B4. Tests: in `frontend/src/app/pages/dashboard/page-detail/page-detail.component.spec.ts` change "creates with the drafts and folder, then goes back to the list with the created item" to expect `navigationService.navigateReplacingUrl` called once with `(AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, 9)` and `navigateWithState` not called; keep the "keeps the popup open with the draft when Create fails" test asserting no navigation (add `navigateReplacingUrl` to that expectation). In `frontend/src/app/pages/dashboard/document-pages/document-pages.component.spec.ts` delete the two `createdItem` tests ("places an item created in a folder…", "leaves out a created item of another project…") and the `getCurrentNavigation` spy setup if nothing else uses it. Run `npm test`.

### C. Title prefill and focus
- [x] C1. In `foldered-item-detail.base.ts` `loadTemplateContent`, on success also set `draftTitle = response.title` when `draftTitle === ''`.
- [x] C2. In `frontend/src/app/components/item-detail-layout/item-detail-layout.component.ts` add `@Input() autofocusTitle = false`, `@ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>` and `ngOnChanges(changes: SimpleChanges)` that, when `changes['autofocusTitle']?.currentValue` is `true` and its previous value was not, runs `setTimeout(() => { this.titleInput?.nativeElement.focus(); this.titleInput?.nativeElement.select(); })`. In the template add `#titleInput` and `[attr.cdkFocusInitial]="autofocusTitle ? '' : null"` to the title `<input>`.
- [x] C3. In `frontend/src/app/pages/dashboard/page-detail/page-detail.component.html` and `frontend/src/app/pages/dashboard/diagram-detail/diagram-detail.component.html` bind `[autofocusTitle]="mode === 'create' && !isLoading"` on `app-item-detail-layout`.
- [x] C4. Tests in `page-detail.component.spec.ts`: rename and update "prefills the content from a template and keeps the folder and the untitled title" so the resolve stub returns `{success: true, title: 'Agenda', content: '<h1>Agenda</h1>'}` and it expects `draftTitle` to be `'Agenda'` and the create call to contain `title: 'Agenda'`; add a test that a title typed before the template resolves is kept (set `draftTitle = 'Mine'` before `tick()`, expect `'Mine'` afterwards); the failed-template test keeps expecting an empty title. Add a focused spec for `ItemDetailLayoutComponent` only if it can be done meaningfully with `TestBed` (render in create mode with `autofocusTitle` true, `tick()`, expect `document.activeElement` to be the title input); otherwise rely on the manual check in Z2. Run `npm test`.

### D. Docs
- [x] D1. Update `CLAUDE.md` (Services and HTTP, the "Pages and diagrams share …" bullet): Create sends title, content, project and folder in one request and then opens the created item in view mode, replacing the `…/new` URL; remove the sentence about passing `createdItem` in router navigation state. In the Templates bullet, say a picked template prefills the title and content through `TemplateService.resolve`.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test` and `npm run build` in `frontend/`). The component style budgets must still pass.
- [ ] Z2. Manual check in the running app: Pages → New page → the title field has focus → type a title and some content → Create → the popup shows the page in view mode at `/dashboard/pages/:id`, browser Back returns to the Pages list. Repeat with "From template" → pick "Meeting notes" → the title shows "Meeting notes" selected → type to replace it → Create. Repeat with an empty title (heading shows "Untitled"), with a folder's "+" (the item is in that folder after closing), and for Diagrams. Check that a failed Create (e.g. stop the backend) keeps the draft.
