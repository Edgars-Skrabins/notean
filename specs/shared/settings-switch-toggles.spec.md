# Settings switch toggles — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

On/off preferences are drawn with `app-checkbox`, which today is a **round** box with a filled dot when checked, so it reads as a radio button (UX critique 2026-11-04, "Settings uses round app-checkbox for on/off (reads as radio)"; Nielsen #4 consistency and #6 recognition). This feature adds a **switch** control for on/off settings and uses it for the three Settings toggles and the four Manage team feature toggles. `app-checkbox` stays for picking items from a list, for filters and for options confirmed by a dialog button, and becomes a **square** box with a check mark so it no longer looks like a radio.

A switch means "this takes effect now" on every platform. Manage team features already save on change; the Settings toggles currently wait for the page's Save button, so they now save on change too. Theme and mode keep their live preview and Save button.

- **Users:** every member (Settings), the team owner (Manage team features, owner only as today), and everyone who uses a checkbox elsewhere (List tab rows, ticket filter, ticket tags, project members, chat member picker, delete-folder dialog, diagram "Show resolved").
- **Usage:**
  - **Settings** (`pages/dashboard/settings/`): below Appearance, three rows, each with its label on the left and a switch on the right: "Show favorites on Home", "Show favorites in the sidebar", "Show My Work on Home". Clicking the row (label or switch) or pressing Space on the focused switch flips it, and the change is saved right away; the switch's position is the feedback (no success toast). If saving fails, the switch flips back and the existing "Could not save settings" error toast appears. Flipping several switches quickly saves all of them; the last state wins.
  - Theme and mode still preview live and are saved with **Save**, which is enabled only while the theme or mode differs from the saved one. Leaving Settings with an unsaved theme or mode still asks to confirm leaving with unsaved changes; flipping a switch never triggers that question.
  - **Manage team → Features** (owner only): the four rows Pages, Diagrams, Boards, Chat become switch rows, label left, switch right. Behaviour is unchanged: the flag saves on change, a failure flips it back with an error toast, success shows the existing "Features updated" toast.
  - **Checkboxes everywhere else** look like checkboxes: a rounded square with a check mark when checked. Their behaviour doesn't change.
  - Keyboard: switches and checkboxes are native checkboxes, so Tab focuses them, Space toggles, and the focus ring is visible on the track or box.
  - Screen readers announce switches as "switch, on/off" with the row's label.
- **Rules:**
  - Use `app-switch` for a persisted on/off setting that takes effect immediately. Use `app-checkbox` for selecting items in a list, for filters, and for options that a dialog's confirm button applies.
  - No permission, API or data model change: Settings still uses `PATCH /users/me/settings`, Manage team still uses `PATCH /teams/:code/features`.
- **Out of scope:**
  - Where Settings and Manage team live and how their sections are laid out: `account-pages-in-shell.spec.md`, `manage-team-structure.spec.md`.
  - The Language field in Settings: `responsive-dashboard-shell.spec.md`.
  - Saving theme and mode immediately (they keep preview + Save; see decision 3).
  - The diagram comment layer's "Show resolved" control: it is a view filter, so it stays a checkbox (square now).
  - Contrast of the border tokens themselves: `theme-contrast.spec.md`.

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. A native `<input type="checkbox" role="switch">` (ARIA 1.2 switch role on a checkbox; the checked state comes from the native `checked`), the existing `app-icon` `check` icon, theme tokens.

## 2.2 Structure

### New `SwitchComponent` (`frontend/src/app/components/switch/`)

Generate with `npm run newcomponent switch` (no spec file is generated; add `switch.component.spec.ts` by hand). Same API as `CheckboxComponent` so swapping is one tag:

- `switch.component.ts`: selector `app-switch`, standalone, `changeDetection: ChangeDetectionStrategy.Eager`, `@Input() checked = false`, `@Input() disabled = false`, `@Input() ariaLabel = ''`, `@Output() checkedChange = new EventEmitter<boolean>()`, `handleChange(checked: boolean)` sets `checked` and emits, like the checkbox.
- `switch.component.html`:
  ```html
  <label class="switch" [class.switch--disabled]="disabled">
    <input
      type="checkbox"
      role="switch"
      class="switch__input"
      [checked]="checked"
      [disabled]="disabled"
      [attr.aria-label]="ariaLabel || null"
      (change)="handleChange($any($event.target).checked)"
    />
    <span class="switch__label"><ng-content></ng-content></span>
    <span class="switch__track" aria-hidden="true"><span class="switch__thumb"></span></span>
  </label>
  ```
  The input comes first so the CSS can style the track with `.switch__input:checked ~ .switch__track`.
- `switch.component.css` (camelCase BEM, tokens only):
  - `:host { display: block; }`
  - `.switch`: `display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: var(--control-height-sm); color: var(--color-text-heading); font-size: var(--font-md); cursor: pointer;`
  - `.switch__input`: `position: absolute; width: 1px; height: 1px; margin: 0; opacity: 0;` (focusable, invisible).
  - `.switch__track`: `position: relative; flex-shrink: 0; box-sizing: border-box; width: 34px; height: 20px; border-radius: var(--radius-pill); background: var(--color-input-bg); border: 1px solid <border token, see below>; transition: background var(--transition-fast), border-color var(--transition-fast);`
  - `.switch__thumb`: `position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--color-text-muted); transition: transform var(--transition-fast), background var(--transition-fast);`
  - Checked: `.switch__input:checked ~ .switch__track { background: var(--color-primary); border-color: var(--color-primary); }` and `.switch__input:checked ~ .switch__track .switch__thumb { transform: translateX(14px); background: var(--color-on-primary); }`.
  - Hover (off): `.switch:hover .switch__input:not(:checked):not(:disabled) ~ .switch__track { border-color: var(--color-input-border-focus); }`.
  - Focus: `.switch__input:focus-visible ~ .switch__track { outline: 2px solid var(--color-input-border-focus); outline-offset: 2px; }`.
  - Disabled: `.switch--disabled { cursor: default; opacity: 0.5; }`.
  - `@media (prefers-reduced-motion: reduce) { .switch__track, .switch__thumb { transition: none; } }`.
  - Border token: use `var(--color-control-border)` if `'--color-control-border'` is in `THEME_TOKENS` (`config/themes.ts`) when you implement this (the `theme-contrast` spec adds it); otherwise use `var(--color-input-border)` and note it in the PR description so the second of the two specs to merge switches it.

### `CheckboxComponent` becomes square (`frontend/src/app/components/checkbox/`)

- Template: rename `checkbox__circle` to `checkbox__box` and put `<app-icon class="checkbox__check" name="check" aria-hidden="true"></app-icon>` inside it; import `IconComponent`.
- CSS: `.checkbox__box` keeps size, background and transition of today's `.checkbox__circle`, with `border-radius: 4px` (a fixed small radius so every theme's box reads as square; theme radii go up to 8px, which is a circle at 20px), `display: flex; align-items: center; justify-content: center;`, border token as for the switch track. Remove the `::after` dot rules. `.checkbox__check { width: 14px; height: 14px; color: var(--color-on-primary); transform: scale(0); transition: transform var(--transition-fast); }`. Checked: `.checkbox__input:checked ~ .checkbox__box { background: var(--color-primary); border-color: var(--color-primary); }` and `.checkbox__input:checked ~ .checkbox__box .checkbox__check { transform: scale(1); }`. Keep the focus-visible ring rule, renamed to the new class. Add the same `prefers-reduced-motion` guard for the check's transition.
- Grep `frontend/src/app` for `checkbox__circle` (for example in other components' CSS or specs) and rename those references.

### Settings (`frontend/src/app/pages/dashboard/settings/`)

- `models/settings.model.ts`: add `export type ToggleSetting = 'showFavoritesOnHome' | 'showFavoritesInSidebar' | 'showMyWorkOnHome';`.
- `settings.component.html`: the three `app-checkbox` elements in `div.settings__options` become `app-switch` with the same bindings. `settings.component.ts`: replace `CheckboxComponent` with `SwitchComponent` in `imports`.
- `settings.component.ts` behaviour:
  - `hasUnsavedChanges` compares only `theme` and `themeMode` with `savedSettings`.
  - `handleSettingChange(key: ToggleSetting, checked: boolean)` updates `this.settings[key]` and calls a private `saveToggles()`.
  - `saveToggles()`: if `isSavingToggles`, set `hasQueuedToggleSave = true` and return. Otherwise set `isSavingToggles = true` and call `settingsService.update({...this.savedSettings, showFavoritesOnHome: this.settings.showFavoritesOnHome, showFavoritesInSidebar: this.settings.showFavoritesInSidebar, showMyWorkOnHome: this.settings.showMyWorkOnHome})` (saved theme and mode, so an unsaved preview is never saved by a switch).
    - Success: `savedSettings = response.settings`; if `hasUnsavedChanges` (a theme or mode preview is pending), call `themeService.preview(this.settings.theme, this.settings.themeMode)`, because `SettingsService.update` applies the saved theme.
    - Failure: set the three toggles in `this.settings` back to `savedSettings`' values, clear `hasQueuedToggleSave`, show `{type: ToastType.ERROR, message: PHRASES.SETTINGS_SAVE_FAILED}`.
    - Finally: `isSavingToggles = false`; if `hasQueuedToggleSave`, clear it and call `saveToggles()` again (it sends the latest values).
  - The `settings$` subscription also skips while `isSavingToggles` is true, so a response for an older request never overwrites a newer switch position.
  - `handleSave()` keeps saving `this.settings` and its success toast; it now matters only for theme and mode. `confirmLeave`, the leave dialog and `ngOnDestroy`'s revert to the saved theme stay.
- No new phrases; `SETTINGS_SAVE_FAILED` and the toggle labels exist.

### Manage team (`frontend/src/app/pages/manage-team/`)

- `manage-team.component.html`: the `app-checkbox` in `div.manageTeam__features` becomes `app-switch` with the same bindings. `manage-team.component.ts`: replace `CheckboxComponent` with `SwitchComponent` in `imports`. `handleFeatureChange` is unchanged.

### Tests

- `components/switch/switch.component.spec.ts` (new, `TestBed`): renders an `input[type=checkbox][role=switch]` whose `checked` follows the input; clicking the label emits `true`, clicking again emits `false`; a disabled switch doesn't emit and its input is disabled; `ariaLabel` sets `aria-label`; projected content is inside `.switch__label`.
- `pages/dashboard/settings/settings.component.spec.ts`: replace "has unsaved changes as soon as a checkbox differs" and the two toggle-based save tests with: a switch change calls `update` at once with the saved theme/mode and the new toggle, and `hasUnsavedChanges` stays false; with a pending theme preview, a switch change sends the saved theme and re-previews the pending one after success, `hasUnsavedChanges` stays true; a failed switch save restores the toggle and shows `SETTINGS_SAVE_FAILED`; a second switch change while the first is saving is sent once the first finishes, with both values, and a `settings$` emission in between doesn't overwrite the second change; `confirmLeave()` returns `true` right after a switch change. Keep the theme/mode tests; the Save tests use a theme change instead of a toggle.
- `pages/manage-team/manage-team.component.spec.ts`: "shows the Features toggles …" queries `app-switch` instead of `app-checkbox`.
- Specs of other components that query `app-checkbox` keep working (tag and API unchanged).

### Docs

`CLAUDE.md`, Frontend > Components: add a bullet: on/off settings that apply immediately use `app-switch` (`components/switch/`, a native checkbox with `role="switch"`); `app-checkbox` (square, check mark) is for choosing items, filters and options a dialog confirms. In the Themes paragraph, where theme and mode are said to be saved with the other settings, say the Settings toggles save on change while theme and mode are previewed and saved with Save.

### Parallel work

- **theme-contrast** adds `--color-control-border` and switches the checkbox's unchecked border to it. Whichever spec merges second reconciles: the box and track borders use `--color-control-border` once it exists (see the border token note above).
- **account-pages-in-shell** moves Settings and Manage team into the dashboard (routes, wrapper class, back button, Esc, constructor parameters) and keeps `unsavedChangesGuard` on Settings, which still makes sense because theme and mode stay staged. This spec only swaps the elements inside `div.settings__options` and `div.manageTeam__features` and changes the save logic in `settings.component.ts`; resolve constructor-parameter conflicts by keeping both changes.
- **responsive-dashboard-shell** adds a Language field inside `section.settings__appearance`; untouched here.
- **manage-team-structure** reorganises the Manage team sections; keep the features rows as `app-switch` wherever that section ends up.
- **accessible-control-names** doesn't touch checkboxes or switches. **list-tab-polish** keeps `app-checkbox` in rows; its look changes only through this spec's CSS.
- `CLAUDE.md` is edited by several specs; change only the lines named above.

## 2.3 Decisions

1. **A switch for on/off settings, a square checkbox for selection** (2026-11-04). Reason: the round checkbox reads as a radio (Nielsen #4 and #6); Impeccable operate.md "Same form-control vocabulary" and "Reinventing standard affordances for flavor (… weird form controls)" is a product constraint; switches for binary settings and square checkboxes for selection are the platform conventions (Material, Apple HIG). Rejected: only squaring the checkbox and keeping it for settings (fixes the radio look but the brief asks for switches on preferences, and a checkbox in a settings list implies a Save step); replacing every checkbox with a switch (filters and multi-select lists are checkbox territory).
2. **Native `input type="checkbox"` with `role="switch"`** (2026-11-04). Reason: keeps keyboard (Space), form semantics and focus for free, and screen readers announce "switch, on/off" (WCAG 4.1.2). Rejected: a `button` with `aria-checked` (reimplements what the input already does).
3. **Settings toggles save on change; theme and mode keep preview + Save** (2026-11-04). Reason: a switch promises immediate effect (Material: "switches … immediately activate or deactivate"; Apple HIG; NN/g toggle-switch guideline), and Manage team's features already behave that way (Impeccable polish.md "Match neighboring … save behavior"). Theme and mode stay staged because they already preview live and other parallel specs rely on Settings keeping its unsaved-changes guard (`account-pages-in-shell`). Rejected: switches that wait for Save (breaks the switch's promise); autosaving the whole page including theme (also removes the guard and the preview/cancel path the parallel specs keep).
4. **No success toast for a Settings switch** (2026-11-04). Reason: the switch position is the confirmation; Impeccable clarify.md "Routine success should be brief", and a toast per flip would be noise. Errors still toast and revert. Manage team keeps its "Features updated" toast because flipping a feature changes the team for everyone (the owner benefits from the confirmation), and it is existing behaviour outside the critique.
5. **Queue switch saves instead of sending one request per flip in parallel** (2026-11-04). Reason: parallel requests could finish out of order and leave the server on an older state; a one-in-flight queue always ends with the latest values (Impeccable harden: race conditions). Each request carries all three toggles, so nothing is lost.
6. **Label left, switch right, the whole row clickable** (2026-11-04). Reason: the settings-list layout users know from OS and app settings (Impeccable operate.md "earned familiarity"); the full-row hit target meets touch sizes without enlarging the track.
7. **Colours: primary track and on-primary thumb when on, input background with a control border and muted thumb when off** (2026-11-04). Reason: accent for the "on" state only (Impeccable operate.md "Accent color used for … state indicators only"); the off state's boundary uses the control border so the control is visible (WCAG 1.4.11), and the thumb's position, not colour alone, carries the state (WCAG 1.4.1).
8. **Fixed 4px checkbox radius** (2026-11-04). Reason: theme radii (`--radius-sm` up to 8px) would turn a 20px box back into a near-circle in some themes, recreating the bug.

### Decisions to double-check

- **Settings toggles now save immediately** (no Save needed, no success toast). This changes when Settings writes to `PATCH /users/me/settings`; theme and mode still use Save.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Switch component
- [ ] A1. Generate `components/switch/` with `npm run newcomponent switch` and write the TS, HTML and CSS from Part 2.2 (pick the border token as described).
- [ ] A2. Add `components/switch/switch.component.spec.ts` with the tests from Part 2.2. Run `npm test`.

### B. Square checkbox
- [ ] B1. Update `checkbox.component.html` / `.ts` / `.css` to the square box with the check icon (Part 2.2) and rename any `checkbox__circle` references found by grep. Run `npm test` and `npm run build` (style budget).

### C. Settings
- [ ] C1. Add `ToggleSetting` to `models/settings.model.ts`; swap the three `app-checkbox` for `app-switch` in `settings.component.html` and the import in `settings.component.ts`.
- [ ] C2. Implement the immediate save with the queue, the narrowed `hasUnsavedChanges` and the `settings$` skip in `settings.component.ts` (Part 2.2).
- [ ] C3. Update `settings.component.spec.ts` as described in Part 2.2. Run `npm test`.

### D. Manage team
- [ ] D1. Swap `app-checkbox` for `app-switch` in the features section of `manage-team.component.html` and the import in `manage-team.component.ts`; update the features test in `manage-team.component.spec.ts`. Run `npm test`.

### E. Docs
- [ ] E1. Update `CLAUDE.md` (Components bullet and the Themes sentence) as described in Part 2.2.

### Z. Wrap-up
- [ ] Z1. Full test runs (`npm test` in `frontend/`, `bin/rails test` in `backend/`) and `npm run build`; run `/Users/edgarsskrabins/.claude/skills/impeccable/scripts/impeccable detect --json frontend/src/app/components/switch frontend/src/app/components/checkbox` once and fix real findings.
- [ ] Z2. Manual check in the running app, in Purple haze dark and Paper light: Settings shows three switch rows; flip one, reload the page, it kept its state; flip all three quickly, reload, all three kept; preview another theme, flip a switch, the preview stays and Save is still enabled; leave the page, the unsaved-changes question appears only because of the theme. With the API stopped, flip a switch: it flips back and the error toast shows. Manage team (as owner): feature switches turn a feature off and on with the toast. Tab to a switch and a checkbox: the focus ring is visible, Space toggles. Ticket filter, List tab rows, project members and the delete-folder dialog show square checkboxes with a check mark. Check 375px width: switch rows don't overflow.
