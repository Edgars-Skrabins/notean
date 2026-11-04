# Compact comment composer — Spec

**Type:** feature
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

Every comment thread (ticket popup, page view mode, diagram comment pins) ends with a composer: a formatting toolbar (Bold, Italic, H2, lists) above a 72px-tall empty editor and a **Comment** button. It shows in full before anyone has written anything, so a ticket with no comments ends in a large empty box and a toolbar that compete with the ticket itself.

The composer becomes a single line, **Add a comment…** (in a diagram pin thread: **Reply…**), until the user wants to write. Clicking it, tapping it or pressing Enter/Space on it opens the full editor with the cursor already inside.

- **Users:** every team member who can see a ticket, page or diagram and comments on it.
- **Usage:**
  1. **Collapsed (default):** below the comments (or the "No comments yet" line) sits one field-like button, full width, at the app's control height, with muted text "Add a comment…" (pin threads: "Reply…"). No toolbar, no submit button.
  2. **Open:** activating the collapsed button replaces it with today's compact editor (toolbar, editor, mentions with `@`) and a button row aligned right: **Cancel** (ghost) and the existing submit button (**Comment** / **Reply**, disabled until there is text). The caret is placed in the editor.
  3. **Posting:** the submit button posts as today. On success the comment is appended, the draft is cleared, the composer collapses and keyboard focus moves to the collapsed button. On failure the composer stays open with the draft and the error shows in the list's alert line as today.
  4. **Cancel:** clears the draft and collapses, focus on the collapsed button. No confirmation.
  5. **Leaving an empty composer:** when focus moves out of the open composer (Tab away, click elsewhere) and the draft has no text, it collapses. A draft with text stays open, so nothing typed is ever lost by clicking away.
  6. **Loading:** the composer appears once the thread has loaded, as today. While posting, the submit button is disabled as today.
- **Rules:** presentation only. Who may comment, comment limits and the API are unchanged. Esc keeps its current behaviour (it is not handled by the editor and reaches the popup or panel behind it).
- **Out of scope:**
  - The new-pin composer in `DiagramCommentLayerComponent` (`commentLayer__new`): the user has just placed a pin to write a comment, so it stays open.
  - The edit mode of an existing comment (`CommentItemComponent`).
  - A keyboard shortcut to post (Ctrl/Cmd+Enter) and draft persistence across closes.
  - The accessible name of the editor itself: `accessible-control-names` owns it.
  - The "No comments yet" wording: `empty-states-guidance` owns bare empty states.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing stack: Angular templates, Tiptap's `autofocus` editor option, ngx-translate, the shared `ButtonComponent` and `.textInput` class. No new dependencies.

## 2.2 Structure

**`RichTextEditorComponent`** (`components/rich-text-editor/`, changed): new `@Input() autofocus = false`. In `ngAfterViewInit` the `Editor` is created with `autofocus: this.autofocus ? 'end' : false`. Nothing else changes.

**`CommentListComponent`** (`components/comment-list/`, changed):
- New `@Input() placeholder: string = PHRASES.COMMENT_PLACEHOLDER`.
- New state `isComposerOpen = false` and a `@ViewChild('composerTrigger') composerTrigger?: ElementRef<HTMLButtonElement>`.
- `openComposer()` sets `isComposerOpen = true`.
- `cancelComposer()` clears `draft`, closes and calls `focusTrigger()`.
- `handleComposerFocusOut(event: FocusEvent)` closes only when `event.relatedTarget` is not inside the composer element (passed from the template as `$event.currentTarget`) and `hasCommentText(this.draft)` is false.
- `post()`: after a successful create it also closes and calls `focusTrigger()`.
- `focusTrigger()` (private) waits one tick (`setTimeout`) for the trigger to render, then focuses `composerTrigger`.
- `ngOnChanges` on a new `target` also resets `isComposerOpen` and `draft`.

**`comment-list.component.html`** (changed): the `.commentList__new` block becomes:
- `*ngIf="isLoaded && !isComposerOpen"`: `<button #composerTrigger type="button" class="commentList__trigger textInput" (click)="openComposer()">{{ placeholder | translate }}</button>`.
- `*ngIf="isLoaded && isComposerOpen"`: a `div.commentList__new` with `(focusout)="handleComposerFocusOut($event)"`, holding `<app-rich-text-editor … [autofocus]="true">` (existing bindings kept) and a `div.commentList__actions` with `<app-button variant="ghost" (pressed)="cancelComposer()">{{ PHRASES.CANCEL | translate }}</app-button>` and the existing submit button.

**`comment-list.component.css`** (changed): `.commentList__trigger` (full width, `text-align: left`, `height: var(--control-height)`, `color: var(--color-text-muted)`, `cursor: text`, `font-family: var(--font-ui)`); `.commentList__actions` (flex row, `justify-content: flex-end`, `gap: var(--space-2)`); `.commentList__submit`'s `align-self` rule is no longer needed and goes. No hardcoded colours.

**`diagram-comment-layer.component.html`** (changed): the thread's `<app-comment-list>` passes `[placeholder]="PHRASES.REPLY_PLACEHOLDER"`.

**Translations:** new keys `COMMENT_PLACEHOLDER` ("Add a comment…") and `REPLY_PLACEHOLDER` ("Reply…") in `config/phrases.ts` next to `POST_COMMENT` / `REPLY`, and in every file in `frontend/public/assets/translations/` (en, lv, et, lt, ru, sv, fi, de, da, fr, es), placed next to `"POST_COMMENT"` / `"REPLY"`, not at the end of the file. Use the real ellipsis character "…".

**Parallel work:**
- `accessible-control-names` adds an accessible name to the comment composer's editor, most likely by a new input on `RichTextEditorComponent` bound on the same `<app-rich-text-editor>` line in `comment-list.component.html`. This spec adds `[autofocus]="true"` to that element and moves it inside the new open block. When merging, keep both bindings on the element.
- `dialog-accessibility` traps focus in the ticket popup; the collapsed button and the open composer are ordinary focusable content inside it.
- `ui-copy-consistency` may change button casing; the new Cancel button uses `app-button` like the others, so it follows automatically.

## 2.3 Decisions
1. **Collapsed composer shape (2026-11-04):** a single field-like button reading "Add a comment…", not an always-open editor. Reason: Impeccable distill.md "Progressive disclosure: hide complexity behind clear entry points" and "Remove decorations… that don't serve"; the pattern users know from GitHub, Jira and Google Docs (Impeccable operate.md "earned familiarity"). A real `<button>` gives keyboard (Enter/Space) and screen reader access with its visible text as its name (WCAG 4.1.2). Rejected: a read-only `<input>` that expands on focus (an input that is not for typing misleads assistive tech), hiding only the toolbar (still a large empty box).
2. **Focus on open (2026-11-04):** the editor is focused with the caret at the end (Tiptap `autofocus: 'end'`). Reason: activating "Add a comment…" is a request to type (Nielsen #7 efficiency); WCAG 2.4.3 focus order.
3. **When it collapses (2026-11-04):** after a successful post, on Cancel, and on focus leaving the composer only while the draft is empty. Reason: never lose typed text (Nielsen #5 error prevention, Impeccable harden.md "Preserve user input"). Typing `@` makes the draft non-empty, so the mention picker overlay (outside the composer element) can never collapse it. Rejected: collapsing on any blur (loses drafts), never auto-collapsing (an opened-and-abandoned editor keeps its clutter).
4. **Cancel discards without confirmation (2026-11-04):** Cancel is an explicit action on a short draft. Reason: Impeccable operate.md "Modal as first thought" is a product constraint; `trash-undo-without-confirm` moves the app away from confirms for small reversible-feeling actions. Rejected: a "Discard comment?" confirm dialog.
5. **Focus after collapsing (2026-11-04):** moves to the collapsed button. Reason: the open block is removed from the DOM, and focus must not fall back to `<body>` (WCAG 2.4.3); keeps the user where they were to add another comment.
6. **Esc unchanged (2026-11-04):** the editor deliberately leaves Esc to the popup (`rich-text-editor` returns `true` for Escape without `preventDefault`). Reason: changing it would mean registering a new `EscapeService` layer per composer; the current behaviour is consistent across editors. Rejected: Esc collapses an empty composer (worth considering later together with dialog Esc rules).
7. **Pin replies use "Reply…" (2026-11-04):** the diagram thread already labels its submit button "Reply". Reason: Nielsen #4 consistency of wording within one surface.
8. **Same component everywhere (2026-11-04):** the change lives in `CommentListComponent`, so tickets, pages and pin threads behave the same. The new-pin composer stays open (see Out of scope).
9. **Collapsed button spacing (2026-11-04):** `.commentList__trigger` also gets `padding: 0 10px` and `font-size: var(--font-md)`, the same as the other `.textInput` fields (`templateList__search`). Reason: Impeccable consistency; `.textInput` has no padding of its own, so the text would touch the border.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Editor autofocus
- [x] A1. Add `@Input() autofocus = false` to `frontend/src/app/components/rich-text-editor/rich-text-editor.component.ts` and pass `autofocus: this.autofocus ? 'end' : false` to the `Editor` in `ngAfterViewInit`.
- [x] A2. In `rich-text-editor.component.spec.ts`, add a test that a component created with `autofocus = true` has a focused editor after the first `detectChanges` (`editor.isFocused` or `document.activeElement` inside `.ProseMirror`), and one that the default leaves it unfocused. Reuse the existing `afterEach` blur.

### B. Collapsible composer
- [x] B1. Add `COMMENT_PLACEHOLDER` and `REPLY_PLACEHOLDER` to `frontend/src/app/config/phrases.ts` next to `POST_COMMENT` / `REPLY`, and to all 11 translation files next to `"POST_COMMENT"` / `"REPLY"` with proper translations ("Add a comment…" / "Reply…" in English).
- [x] B2. In `frontend/src/app/components/comment-list/comment-list.component.ts`, add the `placeholder` input, `isComposerOpen`, the `composerTrigger` view child, `openComposer`, `cancelComposer`, `handleComposerFocusOut`, the private `focusTrigger`, the collapse on successful `post()`, and the reset in `ngOnChanges`, as in Part 2.2. Import `ElementRef` and `ViewChild`.
- [x] B3. Update `comment-list.component.html` to the collapsed button and the open block (editor with `[autofocus]="true"`, Cancel and submit in `.commentList__actions`), and `comment-list.component.css` with `.commentList__trigger` and `.commentList__actions`, removing the unused `.commentList__submit` rule (and the `commentList__submit` class from the template if nothing else uses it).
- [x] B4. Pass `[placeholder]="PHRASES.REPLY_PLACEHOLDER"` to the thread's `<app-comment-list>` in `frontend/src/app/components/diagram-comment-layer/diagram-comment-layer.component.html`.
- [x] B5. Extend `comment-list.component.spec.ts`: the composer starts closed; `openComposer()` opens it; `handleComposerFocusOut` with a `relatedTarget` outside and an empty draft closes it, with text keeps it open, with a `relatedTarget` inside keeps it open; `cancelComposer()` clears the draft and closes; a successful `post()` closes it, a failed one keeps it open with the draft; a new `target` resets it. Keep the existing "appends a posted comment and clears the editor" test passing.

### Z. Wrap-up
- [x] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test`, `npm run build` in `frontend/`; `bin/rails test` in `backend/` to confirm the untouched baseline).
- [ ] Z2. Manual check in the running app: open a ticket with no comments and see the one-line "Add a comment…"; Tab to it and press Enter, type, post, and see focus return to the collapsed line; open it and click away with nothing typed (collapses), then type a word and click away (stays open); type `@` and pick a person; press Cancel; repeat in page view mode and in a diagram pin thread ("Reply…"). *(Not done 2026-11-04: ports 3000/4200 were taken by other sessions and the browser pane's per-folder dev-server limit was reached, so the frontend could not run beside the backend. Tests: frontend 990 passing, backend 896 runs / 0 failures, build clean.)*
