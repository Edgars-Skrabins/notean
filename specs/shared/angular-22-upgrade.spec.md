# Angular 22 upgrade — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

The frontend runs on Angular 18 and Tiptap 2. Angular 18 is out of support, and `npm audit --omit=dev` reports 30 vulnerabilities (4 high, in `@angular/core`, `common`, `compiler` and `router`; the rest moderate, in the other `@angular/*` packages, `@angular/cdk` and Tiptap). Every fix is a major version upgrade. This change upgrades the frontend to Angular 22, Tiptap 3 and ngx-translate 18, so the app is on supported versions and the audit is clean. Users should notice no difference.

- **Users:** everyone using the app (no visible change), and developers working on the frontend (new versions, the `@angular/build` builder, no `standalone: true` flags).
- **Usage:** unchanged. Every screen, the page editor, diagrams, boards, translations, themes and live updates work exactly as before.
- **Rules:**
  - `npm audit --omit=dev` reports 0 vulnerabilities once this is done.
  - The page editor accepts and produces the same HTML as today: bold, italic, heading level 2, bullet and ordered lists, plus StarterKit's other v2 behaviour (paragraphs, code, blockquote, history and so on). Tiptap 3 StarterKit's new defaults (Link, Underline, ListKeymap, TrailingNode) are switched off.
  - Change detection stays zone-based (zone.js).
  - The production budgets in `angular.json` stay as they are, and the build must stay within them.
- **Out of scope:**
  - Zoneless change detection. It touches about 29 component and page files and needs its own redraw approach (signals or `markForCheck`), so it gets its own spec after this one. That spec also decides the redraw approach.
  - Moving tests from Karma to Vitest. Karma is still supported in Angular 22, so the 743 specs stay as they are.
  - Optional Angular migrations: control flow (`@if` / `@for`), `inject()`, signal inputs and outputs. Templates keep `*ngIf` / `*ngFor`, and components keep `@Input()` / `@Output()` as `CLAUDE.md` describes.
  - Upgrading AntV X6 (v2 to v3), axios, `@rails/actioncable` or the fonts. None of them has an advisory.

# Part 2 — Technical details

## 2.1 Tools and libraries

Version changes in `frontend/package.json`:

| Package | From | To |
|---|---|---|
| `@angular/common`, `compiler`, `core`, `forms`, `platform-browser`, `router` | ^18.1.0 | ^22.2.3 (latest 22.x) |
| `@angular/cdk` | ^18.2.14 | ^22.2.4 (latest 22.x) |
| `@angular/cli`, `@angular/compiler-cli` | ^18.1.0 | latest 22.x |
| `@angular-devkit/build-angular` | ^18.1.0 | removed, replaced by `@angular/build` (latest 22.x) |
| `@angular/animations`, `@angular/platform-browser-dynamic` | ^18.1.0 | removed (not imported anywhere in `src/`) |
| `typescript` | ~5.5.2 | ~6.0 (Angular 22 needs `>=6.0 <6.1`) |
| `zone.js` | ~0.14.3 | ~0.16 (Angular 22 accepts `~0.15 \|\| ~0.16`) |
| `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit` | ^2.6.0 | ^3.32.0 (all three on the same version) |
| `@ngx-translate/core` | ^15.0.0 | ^18.0.0 |
| `@ngx-translate/http-loader` | ^8.0.0 | ^18.0.0 |

Karma, Jasmine and their launchers stay. Bump them only if Angular 22's Karma builder requires it (its peer range is `karma ^6.4.0`). Node v26 is supported (`@angular/cli@22` engines: `^22.22.3 || ^24.15.0 || >=26.0.0`).

## 2.2 Structure

**Upgrade path.** Angular upgrades one major at a time with `ng update`: 18 → 19 → 20 → 21 → 22. At each step, update `@angular/core`, `@angular/cli` and `@angular/cdk` together and accept the mandatory migrations. Decline optional migrations (control flow, `inject()`, signal inputs, outputs and queries, self-closing tags and so on), except the two this spec asks for:
- the removal of `standalone: true`, which `ng update` 19 runs automatically;
- the move to `@angular/build` (the `use-application-builder` migration, or by hand if `ng update` doesn't offer it).

Tests and the build must pass after each step before the next one starts.

**Changed files:**
- `frontend/package.json` and `package-lock.json`: the versions above.
- `frontend/angular.json`:
  - `build`, `serve`, `extract-i18n` and `test` builders change from `@angular-devkit/build-angular:*` to `@angular/build:*`.
  - The `zone.js` and `zone.js/testing` polyfills stay.
  - The `styles` arrays and budgets don't change.
- `frontend/tsconfig.json`: TypeScript 6 deprecates `baseUrl` and `moduleResolution: "node"`.
  - Set `moduleResolution` to `"bundler"`.
  - Remove `baseUrl`, and write the `paths` entries relative to the tsconfig (e.g. `"./src/app/components/*"`), so the `@components/*` and other aliases keep working.
  - Keep any other changes the `ng update` migrations make.
- `frontend/src/app/app/app.config.ts`:
  - Keep `provideZoneChangeDetection({eventCoalescing: true})`. On 21 and later this is what keeps the app zone-based.
  - Replace `importProvidersFrom([TranslateModule.forRoot({ loader: ... })])` and `httpLoaderFactory` with ngx-translate 18's provider functions: `provideTranslateService({ loader: provideTranslateHttpLoader({ prefix: 'assets/translations/', suffix: '.json' }) })`.
  - `provideHttpClient()` stays, since translations still load through `HttpClient`.
- `frontend/src/app/services/language.service.ts`:
  - `setDefaultLang` is deprecated in ngx-translate 17 and later. Use `setFallbackLang(defaultLanguage)`.
  - Replace the one `defaultLang` read in `src/app` with `getFallbackLang()`.
  - Check `currentLang` the same way and use `getCurrentLang()` if it is deprecated.
  - `instant` and `use` are unchanged.
- The 19 spec files that use `TranslateModule.forRoot()`: if `forRoot` is deprecated or removed in v18, switch them to `provideTranslateService()` in `providers`. Otherwise leave them.
- `frontend/src/app/components/rich-text-editor/rich-text-editor.component.ts`: in Tiptap 3, `StarterKit` includes Link, Underline, ListKeymap and TrailingNode. Configure it as `StarterKit.configure({ link: false, underline: false, listKeymap: false, trailingNode: false })`. The `Editor` options, `isActive` and the toggle commands used here are unchanged in v3. Fix anything else the v3 types report.
- Every component `.ts` file: `standalone: true` is removed by the v19 migration, and no other change is made by hand.
- `CLAUDE.md`, both places:
  - Tech stack: Angular 22, TypeScript 6.0, Tiptap 3, ngx-translate 18.
  - Components rule: from "Every component is `standalone: true` with ..." to "Every component is standalone (Angular's default, no `standalone` flag) with ...".
- `README.md`: only if it names a version or a command that changes.

## 2.3 Decisions

1. **Target version: Angular 22**, the current latest (22.2.x), for the longest support window. Rejected: 21 LTS, which also clears the advisories but leaves less support time.
2. **Builder: switch to `@angular/build`.** `@angular-devkit/build-angular` is deprecated in 22. It is the same esbuild application builder the app already uses, from the package that isn't deprecated. Rejected: keeping the deprecated package.
3. **Test runner: keep Karma + Jasmine.** It is still supported in 22, and keeping it keeps this PR to version changes. A Vitest move can be its own spec. Rejected: migrating to Vitest now, which would make the upgrade much bigger to review.
4. **Tiptap 3 StarterKit: switch off the new default extensions** (Link, Underline, ListKeymap, TrailingNode), so the editor behaves exactly as today. Adding any of them is a separate feature. Rejected: accepting the defaults, which would change page behaviour with no toolbar buttons or styling for them.
5. **ngx-translate: upgrade to 18**, with the provider-function setup (`provideTranslateService`, `provideTranslateHttpLoader`) and the non-deprecated `TranslateService` methods. Rejected: staying on 15, which works with 22 but is several majors behind.
6. **`standalone: true`: let the v19 migration remove it** from all 79 components and update the `CLAUDE.md` rule to match. Rejected: keeping the redundant flag.
7. **Change detection: stay on zone.js in this spec. Zoneless gets its own spec afterwards.** The user wants to go zoneless, but no component uses `ChangeDetectorRef`, signals or `OnPush`. About 29 component and page files set state after axios awaits, RxJS subscriptions, timers, X6 events and ActionCable callbacks, which only redraw because of zones. Doing that inside the upgrade would make regressions hard to tell apart from upgrade breaks. How components trigger redraws (signals or `markForCheck`) is decided in that spec. Rejected: going zoneless in this PR.
8. **Optional `ng update` migrations: none** (control flow, `inject()`, signal inputs and outputs and so on), so the code keeps the conventions `CLAUDE.md` describes. Rejected: running the control-flow migration now.
9. **`@angular/animations` and `@angular/platform-browser-dynamic` are removed.** Nothing in `src/` imports them, `@angular/animations` carries an advisory, and Angular deprecates it in favour of CSS animations.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting:
- Frontend: 743 specs pass (`npm test`).
- `npm run build` succeeds: initial total 690.16 kB raw, 166.52 kB transfer. The only warning is the existing one that `mousetrap` (used by `@antv/x6-plugin-keyboard`) is not ESM.
- `npm audit --omit=dev`: 30 vulnerabilities (26 moderate, 4 high).

Run these in `frontend/`. After every block, `npm test` and `npm run build` must pass before the next block starts.

### A. Angular 18 → 19
- [ ] A1. Run `npx ng update @angular/core@19 @angular/cli@19 @angular/cdk@19`. Accept the mandatory migrations, including the removal of `standalone: true`, and decline the optional ones (decision 8). Check that `git diff` shows no `standalone: false` left behind.
- [ ] A2. Fix any compile errors or failing specs the step causes, without changing behaviour. Tests and build pass.

### B. Angular 19 → 20
- [ ] B1. Run `npx ng update @angular/core@20 @angular/cli@20 @angular/cdk@20`, accepting only the mandatory migrations.
- [ ] B2. Switch to `@angular/build`. Run the `use-application-builder` migration if `ng update` offers it, otherwise do it by hand: replace `@angular-devkit/build-angular` with `@angular/build` in `devDependencies`, and change every `angular.json` builder to `@angular/build:application`, `:dev-server`, `:extract-i18n` and `:karma`. Check that `npm run dev`, `npm test` and `npm run build` all still run.
- [ ] B3. Fix any compile errors or failing specs. Tests and build pass.

### C. Angular 20 → 21
- [ ] C1. Run `npx ng update @angular/core@21 @angular/cli@21 @angular/cdk@21`, accepting only the mandatory migrations. Check that `app.config.ts` still has `provideZoneChangeDetection({eventCoalescing: true})` and that the `zone.js` polyfills are still in `angular.json` (decision 7).
- [ ] C2. Fix any compile errors or failing specs. Tests and build pass.

### D. Angular 21 → 22
- [ ] D1. Run `npx ng update @angular/core@22 @angular/cli@22 @angular/cdk@22`, accepting only the mandatory migrations. TypeScript moves to ~6.0 and zone.js to ~0.16.
- [ ] D2. Update `tsconfig.json` for TypeScript 6 as described in 2.2: `moduleResolution: "bundler"`, no `baseUrl`, and `paths` relative to the tsconfig. Check that every `@components/*`, `@config/*`, `@pages/*`, `@models/*`, `@services/*` and `@utils/*` import still resolves (the build passes) and that the build prints no tsconfig deprecation warnings.
- [ ] D3. Remove `@angular/animations` and `@angular/platform-browser-dynamic` from `package.json` (decision 9) and check that nothing imports them.
- [ ] D4. Fix any compile errors or failing specs. Tests and build pass.

### E. ngx-translate 18
- [ ] E1. Upgrade `@ngx-translate/core` and `@ngx-translate/http-loader` to ^18.0.0.
- [ ] E2. In `app/app.config.ts`, replace `importProvidersFrom([TranslateModule.forRoot(...)])` and `httpLoaderFactory` with `provideTranslateService({ loader: provideTranslateHttpLoader({ prefix: 'assets/translations/', suffix: '.json' }) })`. Keep `provideHttpClient()`.
- [ ] E3. In `services/language.service.ts`, use `setFallbackLang` in place of `setDefaultLang`. Replace the `defaultLang` read in `src/app` with `getFallbackLang()`, and `currentLang` with `getCurrentLang()` if it is deprecated. Update the specs that cover them.
- [ ] E4. Where the 19 specs' `TranslateModule.forRoot()` is deprecated or removed in v18, switch to `provideTranslateService()`. Templates keep `{{ PHRASES.KEY | translate }}` with `TranslateModule` (or `TranslatePipe`) in `imports`.
- [ ] E5. Tests and build pass. In the running app, switching language on the Settings page changes the text, and a reload keeps the chosen language.

### F. Tiptap 3
- [ ] F1. Upgrade `@tiptap/core`, `@tiptap/pm` and `@tiptap/starter-kit` to ^3.32.0, all on the same version.
- [ ] F2. In `components/rich-text-editor/rich-text-editor.component.ts`, use `StarterKit.configure({ link: false, underline: false, listKeymap: false, trailingNode: false })` and fix any v3 type errors. Add a spec (or extend the existing one) that checks the editor's `getHTML()` after bold, italic, heading and both list toggles, and that `Ctrl+U` adds no `<u>`.
- [ ] F3. Tests and build pass.

### G. Docs
- [ ] G1. Update `CLAUDE.md`: in the frontend tech stack, Angular 22, TypeScript 6.0, Tiptap 3 and ngx-translate 18. Change the components rule to "Every component is standalone (Angular's default, no `standalone` flag) with its own `.ts`, `.html` and `.css` files, ...".
- [ ] G2. Update `README.md` only if it names a version or command that changed.

### Z. Wrap-up
- [ ] Z1. `npm audit --omit=dev` reports 0 vulnerabilities. If anything remains, list it in the PR description with the reason it can't be fixed here.
- [ ] Z2. `npm test` (all specs pass, at least the 743 from the baseline plus the new editor spec) and `npm run build` (within the budgets, no new warnings beyond the existing `mousetrap` one).
- [ ] Z3. Manual check in the running app, with the backend running:
  - log in;
  - switch team;
  - create, edit (bold, heading, lists) and save a page, then reopen it;
  - create a diagram with shapes and connectors, save and reload it;
  - on a board, drag a ticket between columns, open the ticket popup and edit it;
  - see a live update from a second browser window;
  - open global search with `/`;
  - change theme and language;
  - check that Esc closes dialogs and popups.
