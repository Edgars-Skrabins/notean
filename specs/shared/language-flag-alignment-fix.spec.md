# Language flag alignment fix — Spec

**Type:** bug fix
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

In the language selector, the flag emoji sits a little higher than the language name, both in the closed trigger and in the open list. Flag and name should be centred on the same line.

- **Reproduce:** open the dashboard or any auth page and look at the language selector (`🇬🇧 English`). The flag glyph sits above the text's centre line. Open the list and every option shows the same offset.
- **Expected:** the flag and the name are vertically centred against each other in the trigger and in every option.
- **Users:** everyone, on the dashboard header and on the auth screens (both use `app-language-switcher`).
- **Rules:** the visible content stays the same (flag, a gap, then the native name), in the same order.
- **Out of scope:** the selector's height. Spec `header-and-type-scale.spec.md` sets it to 28px.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing Angular and CSS only. No new dependencies.

## 2.2 Structure

The cause: `LanguageSwitcherComponent` builds one label string, `` `${flag} ${label}` ``. The emoji glyph's baseline and line box differ from the text font's, so it renders higher. A string can't be aligned, so the flag has to become its own element.

- **`models/dropdown.model.ts`:** add an optional `prefix?: string` to `DropdownOption`.
- **`components/dropdown/dropdown.component.html`:** in the trigger label and in each option label, render `prefix` (when set) in a `<span class="dropdown__prefix">` before the text.
- **`components/dropdown/dropdown.component.css`:**
  - `.dropdown__label` and `.dropdown__optionLabel` become `display: inline-flex; align-items: center; gap: 6px`, keeping the ellipsis on the text part (wrap the text in its own span if needed).
  - `.dropdown__prefix` gets `line-height: 1`, `display: inline-flex` and `flex-shrink: 0`.
- **`components/language-switcher/language-switcher.component.ts`:** options become `{value: code, label, prefix: flag}`.

## 2.3 Decisions
1. **Fix in the shared dropdown** with an optional `prefix`, so any future option with an emoji or icon in front aligns the same way. A language-switcher-only CSS hack on the combined string was rejected because it can't target the emoji alone. (Implementation choice, not one the user asked for.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Overlaps with other specs:** `header-and-type-scale.spec.md` and `radius-and-spacing.spec.md` also change `dropdown.component.css`. If either is in progress on another branch (check `git branch -r` and open pull requests), stop and ask the user before editing that file.

Baseline before starting: run `npm test` in `frontend/` and note the count here.

### A. Fix
- [ ] A1. Add `prefix` to `DropdownOption`, and render and style it in `dropdown.component.html` and `.css` as described in 2.2.
- [ ] A2. Pass the flag as `prefix` in `language-switcher.component.ts`. Update `language-switcher.component.spec.ts` so the options test expects `{value, label, prefix}` (for example `{value: 'en', label: 'English', prefix: '🇬🇧'}`).
- [ ] A3. Add a test in `dropdown.component.spec.ts` (create it if missing) checking that an option with a `prefix` renders a `.dropdown__prefix` element before its label, and that options without one don't.

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Manual check in the running app: on the login page and in the dashboard header, the flag and name are centred together in the closed selector and in every row of the open list. Other dropdowns (project selector, project pickers) look unchanged.
