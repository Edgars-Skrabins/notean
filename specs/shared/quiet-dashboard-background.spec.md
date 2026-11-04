# Quiet dashboard background — Spec

**Type:** feature
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

In the Purple haze theme (the default, and the only theme with `--page-waves-display: block`), three translucent SVG waves fill the bottom 40% of the dashboard behind the content (`dashboard.component.html` / `.css`), and two of them drift sideways forever. Because the content area is transparent, the waves show through and behind List tab rows, board Overview cards, the chat composer and any long screen, competing with the work. The app root (`app.component`) draws a second, fixed wave backdrop behind every route; on dashboard routes it is fully covered by the opaque shell but still rendered and animated. The auth card has its own drifting waves and a 480ms entrance animation.

This feature removes the decorative waves from the dashboard, stops rendering the app backdrop on dashboard routes, stops the endless drift on the remaining (auth and team-flow) waves, and shortens the auth card entrance. The Purple haze identity stays in its gradients, tints and the static waves on the entry screens.

- **Users:** everyone using Purple haze (all new users, since it is the default theme), and especially people who work on long lists or boards at the bottom of the screen, or who are sensitive to motion.
- **Usage:**
  - **Dashboard (every `/dashboard/...` screen, every theme):** no waves. The shell shows only its theme background (`--dashboard-background`, a gradient in Purple haze, a flat colour in the other themes), header and sidebar. Content looks the same everywhere on the screen, top or bottom.
  - **Entry screens (login, register, team selection, create/join/switch team, unavailable):** the Purple haze waves stay behind the page and inside the auth card, but they are still; nothing drifts.
  - **Auth card entrance:** the card fades and rises 8px over 200ms instead of 16px over 480ms. With `prefers-reduced-motion: reduce` it appears without animation (as today).
  - Other themes look exactly as before (they already had waves hidden).
- **Rules:**
  - Theme tokens are unchanged: `--page-waves-display`, `--color-page-wave-*` and `--color-wave-*` stay in `THEME_TOKENS` and in every theme file, now used only by the app backdrop and the auth card.
  - The app backdrop is not in the DOM on dashboard routes.
- **Out of scope:**
  - Purple haze's gradients, translucent header and sidebar and their backdrop blur (theme identity; any token change belongs to `theme-contrast`).
  - The auth card's radial glow (`::before`), static and limited to entry screens.
  - Motion elsewhere (dropdown, tooltip and toast entrances, global search pulse): short state transitions, owned by their components; a global reduced-motion rule is not added here.
  - Layout of the shell (`responsive-dashboard-shell`) and moving account pages into it (`account-pages-in-shell`).

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies. CSS and Angular templates only (`NgIf` in the root component).

## 2.2 Structure

### Dashboard shell (`frontend/src/app/pages/dashboard/dashboard.component.html`, `.css`)
- Template: delete the whole `div.dashboardShell__backdrop` block (with its `svg.dashboardShell__waves` and three paths).
- CSS: delete the `.dashboardShell__backdrop`, `.dashboardShell__waves`, `.dashboardShell__wave--back`, `.dashboardShell__wave--mid` and `.dashboardShell__wave--front` rules, the `@keyframes dashboardWaveDrift` block and the `@media (prefers-reduced-motion: reduce)` block that only stops those waves. `.dashboardShell` keeps `position: relative`, `display: flex`, `flex-direction: column`, `height: 100%`, `overflow: hidden` and `background: var(--dashboard-background)`. `.dashboardShell__body` keeps its rules (its `position: relative` stays; the parallel shell spec relies on the flex layout).

### App root (`frontend/src/app/app/app.component.html`, `.css`, `.ts`)
- Template: render `div.pageBackdrop` only off dashboard routes: `*ngIf="!isDashboardRoute"`. Import `NgIf` in `app.component.ts`.
- CSS: delete the `animation` declarations from `.pageBackdrop__wave--back` and `.pageBackdrop__wave--mid`, the `@keyframes pageWaveDrift` block and the reduced-motion block that only stopped them. The wave fills stay.
- `isDashboardRoute` logic is unchanged (it is already set on every `NavigationEnd`).

### Auth card (`frontend/src/app/components/auth-card/auth-card.component.css`)
- Delete the `animation` declarations from `.authCard__wave--back` and `.authCard__wave--mid` and the `@keyframes waveDriftSlow` block. The wave fills and the `authCard__waves` container stay.
- `.authCard` entrance: `animation: authCardEnter 200ms cubic-bezier(0.25, 1, 0.5, 1) both;` and `@keyframes authCardEnter` from `opacity: 0; transform: translateY(8px)` to `opacity: 1; transform: translateY(0)`.
- The `@media (prefers-reduced-motion: reduce)` block keeps only `.authCard { animation: none; }`. (The existing guard already covered the waves and the entrance; with the drift gone only the entrance remains.)

### Tests
- `frontend/src/app/app/app.component.spec.ts` (new, TestBed with `provideRouter([])`, `provideTranslateService()` or stubs for `LanguageService`, `AuthService`, `SessionService`): with `isDashboardRoute = true` no `.pageBackdrop` is rendered; with `false` it is.
- No CSS assertions: removing the waves and keyframes is checked in the build and manually.

### Parallel work
These specs are implemented at the same time on other branches:
- **responsive-dashboard-shell** also edits `dashboard.component.html` and `.css`. It wraps `<app-dashboard-sidebar>` in a `div.dashboardShell__nav`, adds a scrim, adds rules after `.dashboardShell__content` and its own `@media (prefers-reduced-motion: reduce)` block for the drawer. This spec only deletes the backdrop block and the wave rules, keyframes and the wave-only reduced-motion block. When merging, keep the shell's new reduced-motion block; delete only the one containing `.dashboardShell__wave--back` / `--mid`.
- **account-pages-in-shell** moves Settings, Profile and Manage team under `/dashboard`, so after both merge those screens also lose the app backdrop. No shared files.
- **theme-contrast** edits theme files and `THEME_TOKENS`; this spec changes neither.
- **dialog-accessibility** and **announced-status-messages** may edit `auth-card` or the auth templates for semantics; this spec only touches `auth-card.component.css` animation rules.

## 2.3 Decisions
1. **Remove the dashboard waves entirely** (2026-11-04), in every theme. Reason: Impeccable quieter.md (Operate) "reducing visual noise. Fewer background accents … The tool should disappear more completely into the task"; craft-floor "Backgrounds are surfaces"; operate.md "Accent color used for primary actions, current selection, and state indicators only, not decoration". The waves sit behind task content (List rows, Overview cards, chat composer) where they lower legibility and attract attention. Rejected: lowering their opacity (still decoration behind data); limiting them to Home (inconsistent screen to screen, Nielsen #4); a user toggle in Settings (adds a setting for something no task needs).
2. **Keep the Purple haze gradient shell background, translucent header and sidebar** (2026-11-04). Reason: they are the theme's surfaces and identity, not decoration on top of content; quieter.md "'Quieter' means refined … not generic … the POV stays intact". Their tokens belong to `theme-contrast`.
3. **Keep the waves on entry screens, but still** (2026-11-04). Reason: login and team-flow screens are a single focused card with nothing behind it to compete with, so the waves carry Purple haze's character there (quieter.md "Restrained, not absent"). The endless drift goes everywhere: WCAG 2.2.2 Pause, Stop, Hide (auto-starting motion longer than 5 seconds shown alongside other content needs a way to stop it), and operate.md "Decorative motion that doesn't convey state" is a product constraint. Rejected: keeping the drift behind the existing reduced-motion guard only (only helps people who set the OS preference).
4. **Do not render the app backdrop on dashboard routes** (2026-11-04). Reason: the opaque shell covers it completely, so it is invisible DOM with running animations; removing it is the same "quieter" change with no visual difference. Uses the existing `isDashboardRoute` flag.
5. **Auth card entrance 200ms, 8px, ease-out-quart** (2026-11-04). Reason: operate.md "150–250 ms on most transitions … No orchestrated page-load sequences"; quieter.md "Shorter distances … Refined easing: use ease-out-quart"; craft-floor "Exponential ease-out from an already-visible default". The entrance stays because it marks the screen change between auth steps. The reduced-motion guard already existed and is kept.
6. **Theme tokens unchanged** (2026-11-04). Reason: the app backdrop and auth card still use them, `THEME_TOKENS` is checked by `config/themes.spec.ts`, and `theme-contrast` edits the theme files in parallel.

### Decisions to double-check
- **Purple haze dashboard loses its waves** (2026-11-04): this visibly changes the default theme's look on every dashboard screen. The waves stay (static) on the entry screens.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Dashboard
- [x] A1. `frontend/src/app/pages/dashboard/dashboard.component.html` / `.css`: delete the backdrop block, the wave rules, `dashboardWaveDrift` and the wave-only reduced-motion block (Part 2.2). Check nothing else references `dashboardShell__backdrop` or `dashboardShell__wave` (`grep -rn "dashboardShell__wave\|dashboardShell__backdrop" frontend/src`).

### B. App backdrop and auth card
- [x] B1. `frontend/src/app/app/app.component.*`: render `.pageBackdrop` only when `!isDashboardRoute` (import `NgIf`); remove the wave drift animations, `pageWaveDrift` and their reduced-motion block.
- [x] B2. Add `frontend/src/app/app/app.component.spec.ts`: the backdrop renders when `isDashboardRoute` is false and is absent when true.
- [x] B3. `frontend/src/app/components/auth-card/auth-card.component.css`: remove the wave drift animations and `waveDriftSlow`; change the entrance to 200ms / 8px / `cubic-bezier(0.25, 1, 0.5, 1)`; reduce the reduced-motion block to `.authCard { animation: none; }`.

### Z. Wrap-up
- [x] Z1. Update the root `CLAUDE.md` Themes section only if it describes the waves; otherwise add one sentence there: the `--page-waves-display` / wave tokens are used only by the app backdrop (off the dashboard) and the auth card, the dashboard shell has no decorative background, and no wave animates.
- [x] Z2. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test`, `npm run build` in `frontend/`).
- [x] Z3. Manual check in the running app with Purple haze dark and light: Home, a board's List and Overview tabs and a chat channel show no waves at the bottom, and content reads the same at the bottom as at the top; Paper light and Graphite dark look unchanged; login, register and team selection still show static waves behind the page and in the card, with nothing drifting; the auth card appears quickly with a small rise, and not at all animated with the OS reduced-motion setting on; in the browser inspector no `.pageBackdrop` element exists on `/dashboard/...` routes.
