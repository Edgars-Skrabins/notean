# Announced status messages — Spec

**Type:** bug fix
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

Notean's error lines and toasts are easy to miss, both on screen and with a screen reader. Measured in the UX critique (2026-11-04, Nielsen #1 visibility of system status scored 2/4, #9 error recovery 2/4):

- Every screen shows its errors in `<p class="authStatus">` (`styles.css:275`): 13px, muted grey, centred, with no role. It's used as the error line in 20 templates, from Login to the ticket popup. It looks like a hint, and screen readers never announce it.
- Toasts get `role="alert"` / `role="status"` on an element that is created together with its text. Screen readers often skip live regions that are inserted already filled, so toasts are announced unreliably. Their close button text also gets read.
- Toasts sit at the top centre, on top of the header's global search.
- An Undo toast disappears after 6 seconds even while the pointer is on it or keyboard focus is on *Undo* (WCAG 2.2.1 Timing Adjustable).
- Login and Register aren't forms. There is no `<form>` and no `autocomplete`, so password managers don't offer or save credentials, and Enter works only through per-input `keydown.enter` handlers.
- Manage team shows "Team name updated" in the same grey error line, while every other save in the app confirms with a success toast.

Expected behaviour after the fix:

- **Users:** everyone. Screen-reader users hear errors and toasts as they appear. Sighted users can tell an error from a hint at a glance. Password-manager users get autofill on Login and Register.
- **Usage:**
  - **Inline errors:** an error line shows as a compact tinted box in the error colour (border, tinted background, error text), left-aligned, in the same place as today. Screen readers announce it when it appears (`role="alert"`).
  - **Field errors:** in the create-named-item dialog (New folder, New board, Add column, Add ticket, New channel, Channel settings) and in the project form (New project, Project settings), the error under the name field uses the same look and is announced. The field is marked invalid and points to the error.
  - **Toasts:** they appear at the bottom centre, newest nearest the bottom edge, and slide up (fade only with reduced motion). Each toast is announced once, with its message and its action label if it has one ("Moved to trash. Undo"). Errors are announced assertively, everything else politely. A toast stays while the pointer is over it or focus is inside it, and its countdown continues with the remaining time once both leave.
  - **Login and Register:** real forms. Enter in any field or a click on the button submits once. The browser and password managers recognise the email as the username and offer the current password (Login) or a new password (Register). Browser validation bubbles are off; the app's own translated errors still show.
  - **Manage team rename:** success shows the "Team name updated" success toast, like Settings and Profile. Errors stay inline.
- **Rules:** no change to what errors are shown or when, only to how they look and are announced. Toast durations stay 3 s, or 6 s with an action, plus however long they are paused.
- **Out of scope:**
  - Inline load and empty messages that aren't `.authStatus`: the Activity inbox, My Work, GIF picker, mention picker and global search messages. Their wording and next steps belong to `empty-states-guidance` and `global-search-polish`.
  - Join team and Create team pages becoming `<form>`s. Neither has a password, so there is nothing for password managers to save. This can be done later.
  - A keyboard shortcut to jump into the toast stack. Announcements plus pausing on focus cover the need, and a shortcut would be a new concept to teach.
  - Theme token contrast of `--color-error` on `--color-error-bg`. Tokens belong to `theme-contrast`, see decision 7.

# Part 2 — Technical details

## 2.1 Tools and libraries

- `@angular/cdk/a11y` `LiveAnnouncer` (already installed with `@angular/cdk` 22.2) for toast announcements.
- `node_modules/@angular/cdk/a11y-prebuilt.css` added to both `styles` arrays in `frontend/angular.json` (build and test), right after `overlay-prebuilt.css`. `LiveAnnouncer`'s element relies on its `.cdk-visually-hidden` class; without it the announcer text would show on the page.
- `FormsModule` `ngSubmit` for the auth forms.
- No new dependencies.

## 2.2 Structure

### Shared error class (`frontend/src/styles.css`)

Replace the `.authStatus` block (line ~275) in place with `.errorMessage`:

```css
.errorMessage {
  margin: var(--space-3) 0 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-error) 35%, transparent);
  border-radius: var(--radius-sm);
  background: var(--color-error-bg);
  color: var(--color-error);
  font-size: var(--font-sm);
  line-height: 1.4;
  text-align: start;
}
```

Every `<p class="authStatus" *ngIf="x">` becomes `<p class="errorMessage" role="alert" *ngIf="x">`. Template-specific classes stay alongside it. The 20 lines:

- `components/`: `template-list`, `diagram-comment-layer`, `comment-list`, `item-detail-layout`
- `pages/`: `switch-team`, `create-team`, `register`, `login`, `join-team`, `manage-team` (`alertMessage` line only)
- `pages/dashboard/`: `project-detail`, `board-template-detail`, `ticket-detail`, `document-pages`, `diagrams`, `list-tab`, `profile` (`passwordError`), `kanban-tab`, `board-page`, `board-overview-tab`

Before converting each, check in its `.ts` that every value assigned to the bound property is an error (an `errorPhrase(...)` result or an error phrase such as `INVALID_FORM_DATA`, `PASSWORD_TOO_SHORT` or `PASSWORDS_DO_NOT_MATCH`). On master the only non-error is Manage team's `renameStatusMessage`, which is removed (below).

### Field errors

- `components/create-named-item-dialog`: `.createNamedItemDialog__error` becomes `class="errorMessage createNamedItemDialog__error" role="alert" id="createNamedItemError"`. Its CSS block keeps only the bottom margin (`margin: 0 0 var(--space-4)`). The name input gets `[attr.aria-invalid]="errorMessage ? true : null"` and `[attr.aria-describedby]="errorMessage ? 'createNamedItemError' : null"`.
- `components/project-form`: `.projectForm__error` gets `class="errorMessage projectForm__error" role="alert" id="projectNameError"`. Its CSS block keeps only what differs (`margin: 0`). The name input gets `aria-invalid` / `aria-describedby="projectNameError"` the same way, bound to `nameError`.

### Manage team rename

`pages/manage-team/manage-team.component.ts`: on rename success, call `this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.TEAM_NAME_UPDATED})` and remove `renameStatusMessage` (the property, its assignments and its template line). Update `manage-team.component.spec.ts` accordingly.

### Toasts

- `components/toast/toast.component.html`: remove `[attr.role]`. The toast element is no longer a live region.
- `components/toast/toast.component.ts`: remove the `role` getter. Add `@Output() paused` and `@Output() resumed` (`EventEmitter<void>`). With `@HostListener`s on `mouseenter`, `mouseleave`, `focusin` and `focusout` it tracks `isHovered` and `hasFocus`. `focusout` counts as leaving only when `relatedTarget` is outside the host. It emits `paused` when the first of them becomes true and `resumed` when both are false again.
- `components/toast/toast.component.css`: enter and exit animate from `translateY(100%)` instead of `-100%`. Under `@media (prefers-reduced-motion: reduce)` they animate opacity only.
- `components/toast-container/toast-container.component.css`: `bottom: calc(var(--space-4) + env(safe-area-inset-bottom))` instead of `top`, and `flex-direction: column-reverse` so the newest toast (first in the list) sits at the bottom. Keep `left: 50%` with `transform: translateX(-50%)`, `pointer-events` and `z-index: 70`.
- `components/toast-container/toast-container.component.html`: wire `(paused)="toastService.pause(toast.id)"` and `(resumed)="toastService.resume(toast.id)"`.
- `components/toast-container/toast-container.component.ts`: inject `LiveAnnouncer` and `TranslateService`, implement `OnDestroy`. Subscribe to `toastService.toasts$`, keep a `Set<number>` of announced ids, and for each toast not yet announced and not `leaving`, call `liveAnnouncer.announce(text, toast.type === ToastType.ERROR ? 'assertive' : 'polite')`. The text is `translate.instant(toast.message)`, followed by `'. '` and `translate.instant(toast.action.label)` when there is an action. Drop ids from the set once they leave the list.
- `services/toast.service.ts`: replace the single `setTimeout` per toast with a per-id timer record `{handle, remainingMs, startedAt}`. Add `pause(id)` (clears the handle and subtracts the elapsed time from `remainingMs`) and `resume(id)` (starts a new timer for `remainingMs`). Pausing or resuming a toast that is unknown or already leaving does nothing. `dismiss` clears the record. `MAX_VISIBLE_TOASTS` trimming is unchanged and can dismiss a paused toast.

### Login and Register

`pages/login/login.component.html` and `pages/register/register.component.html`: keep the `card-corner` button outside the form. Wrap the two `.authField`s and the button in `<form class="authForm" novalidate (ngSubmit)="handleLogin()">` (`handleRegister()` on Register). Give the inputs `name="email"` and `name="password"` (required by `ngModel` inside a form). Remove their `(keydown.enter)` handlers. Set `type="submit"` on `.authButton`. Autocomplete:

| Page | Email input | Password input |
|---|---|---|
| Login | `autocomplete="username"` | `autocomplete="current-password"` |
| Register | `autocomplete="username"` | `autocomplete="new-password"` |

Neither page needs new CSS (`<form>` has no default margin and `.authField` spacing is unchanged), so no `.authForm` rule is added unless the manual check shows a gap.

### Files

- Changed: `frontend/angular.json`, `frontend/src/styles.css`, the 20 templates above, `create-named-item-dialog` (`.html`, `.css`), `project-form` (`.html`, `.css`), `manage-team` (`.ts`, `.html`, `.spec.ts`), `toast` (`.ts`, `.html`, `.css`), `toast-container` (`.ts`, `.html`, `.css`), `services/toast.service.ts` and its spec, `login` and `register` (`.html`, plus a TestBed test each), `CLAUDE.md`.
- New: `components/toast-container/toast-container.component.spec.ts`.
- No translation changes (no new text). No backend changes.

### Parallel work

- `dialog-accessibility` edits `create-named-item-dialog.component.html` and `project-form.component.html` (adds `cdkFocusInitial` / `aria-labelledby` to the same name inputs), the wrappers in `item-detail-layout.component.html` and `ticket-detail.component.html`, and adds one rule after `.popupPanel` in `styles.css`. Keep both specs' attributes on the shared inputs.
- `accessible-control-names` also adds `node_modules/@angular/cdk/a11y-prebuilt.css` to `angular.json`, on the same line after `overlay-prebuilt.css`. Identical additions merge cleanly; if a conflict still shows, keep one copy.
- `ui-copy-consistency` changes `.authButton` `text-transform` and the LOGIN label in `styles.css` and the translations. This spec only changes the button's `type`. `quiet-dashboard-background` edits `auth-card` CSS, which this spec doesn't touch.
- `manage-team-structure` restructures `manage-team.component.html`. This spec only swaps the `alertMessage` line's class and role and deletes the `renameStatusMessage` line; keep both when merging.
- `list-tab-polish`, `kanban-card-readability`, `board-overview-focus`, `account-pages-in-shell` (Profile) and `item-title-hierarchy` touch some of the 20 templates. This spec only rewrites the single `.authStatus` line in each.
- `trash-undo-without-confirm` relies on the Undo toast. Pausing on hover or focus makes its Undo reachable. No API change for callers of `ToastService.show`.
- In `styles.css`, write `.errorMessage` where `.authStatus` was, not at the end of the file.

## 2.3 Decisions

1. **Inline errors look like errors: tinted error box instead of muted centred text** (2026-11-04). Reason: Impeccable operate.md asks for a "state-rich semantic vocabulary… error" standardised across the product, and craft-floor.md says "errors name the problem and the recovery". A muted 13px line reads as a hint (Nielsen #1, #9). The box shape and colour together mean colour isn't the only signal (WCAG 1.4.1). It reuses the toast's error tokens, so the vocabulary matches. Rejected: colour change only (fails 1.4.1 next to other muted lines), and adding an alert icon to every line (it means importing `IconComponent` into 20 components for no extra information).
2. **Rename the class to `.errorMessage`** (2026-11-04). Reason: every line changes anyway to gain `role="alert"`, and the old name `authStatus` is wrong in 15 of 20 places (dashboard screens). Rejected: keeping `.authStatus` (misleading name, same diff size) and a new `app-error-message` component (20 more imports for one `<p>`; CLAUDE.md puts repeated looks in `styles.css` classes).
3. **`role="alert"` on the inserted error element** (2026-11-04). Reason: WCAG 4.1.3 Status Messages. An `alert` inserted into the DOM is announced reliably by current screen readers, unlike `status`/`aria-live` regions inserted already filled. All 20 lines are errors that need attention. Rejected: `aria-live="polite"` containers that are always present, which would mean restructuring all 20 templates.
4. **Success confirmation for team rename becomes a toast** (2026-11-04). Reason: Nielsen #4 consistency. Settings, Profile, Project settings and project changes already confirm saves with success toasts, and toasts are now announced. Rejected: a second inline `success` variant with `role="status"`, which is a second pattern for the same event and has the inserted-live-region problem from decision 3.
5. **Toasts announced through CDK `LiveAnnouncer`, not as live regions** (2026-11-04). Reason: WCAG 4.1.3. The announcer's live element exists before any message, so announcements are reliable. It lets errors be assertive and the rest polite, and it reads exactly "message. action" without the close button's label. Rejected: a permanent `aria-live` container around the stack (reads the action and *Close* labels, can't mix politeness levels) and keeping `role` per toast (the unreliable current state).
6. **Toasts move to the bottom centre, newest at the bottom edge** (2026-11-04). Reason: at the top centre they cover the global search, which is the main header control (critique evidence). Bottom centre is the familiar snackbar position for undo-style feedback (Impeccable operate.md: "Standard navigation patterns… consistency over surprise"). It stays clear of the left sidebar, the header's account menu, the bottom-of-sidebar Trash link and the right-side ticket popup actions. Rejected: bottom-right (covers the chat composer's send button and the popups' corner actions), top-right (covers the account menu) and bottom-left (covers the sidebar's Trash link, and its offset would depend on the sidebar width, which `responsive-dashboard-shell` changes).
7. **Error colours stay `--color-error` on `--color-error-bg`, with no token changes here** (2026-11-04). Reason: tokens belong to `theme-contrast`, and the same pairing is already used by error toasts. The manual check in Z3 measures the pairing in Paper light and Purple haze dark. If it is below 4.5:1, report it to the `theme-contrast` work instead of changing tokens in this spec.
8. **Pause the toast countdown while hovered or focused** (2026-11-04). Reason: WCAG 2.2.1 Timing Adjustable and Impeccable harden.md (Accessibility resilience). A 6 s Undo that vanishes while focused drops keyboard focus to `<body>` and loses the Undo. Pausing on hover is the common snackbar behaviour. Rejected: a longer fixed duration (still a time limit, and it keeps toasts in the way longer for everyone) and toasts that never auto-dismiss when they carry an action (they would pile up during bulk work).
9. **Login and Register as `<form novalidate>` with `ngSubmit`, `username` + `current-password` / `new-password`** (2026-11-04). Reason: WCAG 1.3.5 Identify Input Purpose and 3.3.8 Accessible Authentication (password managers must work); Impeccable operate.md native expectations. `novalidate` keeps errors in the app's language and look instead of the browser's own bubbles, which ignore the chosen app language. `username` on the email field is the value password managers key credentials on. Rejected: `autocomplete="email"` on Login (less reliable for credential pairing) and keeping the `keydown.enter` handlers next to the form (Enter would submit twice).
10. **Several toasts appearing in one update are announced oldest first** (2026-11-04, during implementation). Reason: the list is newest first, but screen readers should hear events in the order they happened. Rejected: list order (reads the newest event before the one that caused it).

Decisions to double-check:

- Decision 4 replaces Manage team's inline "Team name updated" line with a success toast. It's a small visible behaviour change, not only a semantic one.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures.

### A. Inline errors
- [x] A1. In `frontend/src/styles.css`, replace the `.authStatus` block in place with the `.errorMessage` block from Part 2.2.
- [x] A2. Convert the 20 `.authStatus` lines listed in Part 2.2 to `class="errorMessage" role="alert"`, keeping each line's `*ngIf` and content. Check each bound property's assignments first, as described in Part 2.2. Afterwards, `grep -rn authStatus frontend/src` returns nothing.
- [x] A3. Manage team: show the success toast on rename, remove `renameStatusMessage` from `manage-team.component.ts` and `.html`, and update `manage-team.component.spec.ts` so it expects `toastService.show` with `ToastType.SUCCESS` and `PHRASES.TEAM_NAME_UPDATED` on a successful rename.
- [x] A4. `create-named-item-dialog` and `project-form`: apply the field-error markup and the `aria-invalid` / `aria-describedby` bindings from Part 2.2, and trim their `__error` CSS blocks to what differs. Extend `create-named-item-dialog.component.spec.ts` (and `project-form.component.spec.ts`) so that with an error set the input has `aria-invalid="true"` and `aria-describedby` pointing at an element with `role="alert"` and the translated text, and without one it has neither attribute.

### B. Toasts
- [x] B1. Add `node_modules/@angular/cdk/a11y-prebuilt.css` after `overlay-prebuilt.css` in both `styles` arrays of `frontend/angular.json`.
- [x] B2. `services/toast.service.ts`: per-toast timer records plus `pause(id)` and `resume(id)` (Part 2.2). Extend `toast.service.spec.ts` (fakeAsync): a toast paused after 1 s is still not leaving after `TOAST_DURATION_MS + 5000`; after `resume`, it leaves after the remaining 2 s and not before; an action toast resumes with its own remaining time; `pause`/`resume` on an unknown or leaving id don't throw or revive it.
- [x] B3. `components/toast`: remove the role, add the hover/focus tracking with `paused` / `resumed` outputs, and switch the animations to bottom entry with a reduced-motion fade.
- [x] B4. `components/toast-container`: bottom-centre `column-reverse` layout, wire `paused`/`resumed`, and announce new toasts through `LiveAnnouncer`. Add `toast-container.component.spec.ts` (construct with a real `ToastService`, a `LiveAnnouncer` spy and a `TranslateService` spy whose `instant` returns the key): showing an info toast announces `'MESSAGE'` politely once even after further emissions; an error toast is announced assertively; a toast with an action is announced as `'MOVED. UNDO'`.

### C. Login and Register
- [x] C1. `pages/login/login.component.html`: the form, `name`s, `autocomplete`s and `type="submit"` from Part 2.2, with the `keydown.enter` handlers removed. Add a TestBed test to `login.component.spec.ts` (provide the existing spies, `provideTranslateService()` and the route stub; replace `AuthCardComponent` with a stub through `TestBed.overrideComponent` if its language switcher needs more providers): the email input has `autocomplete="username"`, the password input `current-password`; dispatching `submit` on the form calls `authService.login` exactly once.
- [x] C2. `pages/register/register.component.html`: the same with `handleRegister()` and `new-password`, plus the matching test in `register.component.spec.ts`.

### Z. Wrap-up
- [x] Z1. Update `CLAUDE.md`: in Frontend → Components, mention `.errorMessage` (with `role="alert"`) among the shared `styles.css` classes. In Services and HTTP (or next to the toast mention), note that toasts sit at the bottom centre, are announced through `LiveAnnouncer`, and pause while hovered or focused. In the tech stack, note that `a11y-prebuilt.css` is included in `angular.json` `styles`.
- [x] Z2. Run `npm test` and `npm run build` in `frontend/` (no style budget errors). The backend is untouched; confirm `git diff --stat` shows no `backend/` changes.
- [ ] Z3. Manual check in the running app: log in with a wrong password (red error box, announced by VoiceOver, Enter submits once, the password manager offers to fill); register page offers a generated password; trash a page (the toast appears bottom centre, VoiceOver says "Moved to trash. Undo", hovering keeps it, Tab to *Undo* keeps it, leaving lets it go); trigger a list load error (for example stop the backend and reload Pages) and see the error box; rename the team (success toast); check the error box contrast in Paper light and Purple haze dark and report any pairing under 4.5:1 to the `theme-contrast` work.
