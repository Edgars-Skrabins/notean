# Theme contrast — Spec

**Type:** bug fix
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

Notean ships nine themes, each with a dark and a light mode (`frontend/src/themes/*.css`, listed in `config/themes.ts`). The UX critique of 2026-11-04 measured several token pairs below WCAG AA, so secondary text, form fields, primary buttons and some avatars are hard to read in common themes. This fix raises the failing tokens to AA in all 18 theme/mode combinations, gives form controls a border that is visible against its surface, themes every placeholder, makes the theme switch instant, makes the selected theme and mode unmistakable in Settings, and adds automated contrast checks so a future theme can't regress.

What goes wrong today (measured with the WCAG 2.x relative-luminance formula) and how to reproduce it:

1. **Faint text below 4.5:1.** `--color-text-faint` (empty states, hints, caps labels, timestamps, placeholders) is 3.41:1 on the Purple haze dark sidebar (Favorites "No favorites yet"), 3.86:1 on Purple haze dark inputs, 3.75:1 on Paper light `--color-card-bg-alt`, 3.97:1 on Winter forest light `--color-card-bg-alt`, and below 4.5:1 on some surface in 13 of the 18 combinations. Reproduce: Settings → Paper, Light; open a popup panel (its background runs into `--color-card-bg-alt`) and read a caps label.
2. **Form fields have no visible edge in light modes.** `--color-input-border` is about 1.15–1.45:1 against the input and its surface in every theme (Paper light `#e3e1da` on white is 1.31:1). A text field reads as a blank area. Reproduce: Paper, Light → Pages list search field.
3. **White on the Purple haze gradient.** Primary buttons, `.authButton` and the active sidebar item in Purple haze dark paint white text on `linear-gradient(90deg, #5a2fe6, #9c6bff)`; at the light end it is 3.52:1. Light mode's end `#8a55f5` is 4.47:1.
4. **Accent text in light modes.** `--color-primary-light` is used as text for links (Load more, mention links), mention chips, highlighted search matches and filter/assignee actions. In light modes it is as low as 2.35:1 (Teal ocean) and 3.0:1 (Coffee) on inputs.
5. **Terminal light active nav item** (`--color-nav-active-text` on `--color-nav-active-bg`) is 4.03:1.
6. **Avatar letters.** Letter avatars on Orange (`#FB8C00`, white letter) are 2.37:1; Green, Cyan, Blue and Red with white letters are 2.74–4.23:1.
7. **Unthemed placeholders.** Only `.authField input`, the Pages / Diagrams / Projects search fields and the create-named-item dialog theme `::placeholder`. Every other input (global search, list tab search, ticket and template fields, profile, team forms) shows the browser default grey: 2.05:1 in Purple haze dark.
8. **Slow theme switch.** Switching theme or mode in Settings makes parts of the screen fade over 2–4 seconds instead of switching at once (the critique attributed it to `transition: all`; the source has no literal `transition: all`, see decision 9).
9. **Unclear selected state in Settings.** In the theme mode switch the selected segment uses `--color-nav-active-bg`, which in Paper light (`#e7e5de` on white) is weaker than the unselected segments' hover; in the theme picker the Purple haze preview's purple tint reads as "selected" while the real selection is only a thin ring.

- **Users:** everyone, in every theme and mode, on every screen.
- **Usage:** nothing to do. After the fix:
  - Faint, muted and heading text is at least 4.5:1 on every surface it sits on (cards, popup gradients, inputs, page and dashboard backgrounds, sidebar, header).
  - Text inputs, textareas, rich-text editor boxes, the dropdown and ticket-filter triggers, checkboxes and the theme mode switch's selected segment have a border of at least 3:1 against both the field and its surface. Cards, panels, rows and dividers keep their quiet border.
  - Every placeholder uses `--color-text-faint` (so ≥ 4.5:1).
  - Primary buttons and active items with white text on the Purple haze gradient are ≥ 4.5:1.
  - Avatar letters are ≥ 4.5:1 on every avatar colour.
  - Picking a theme or mode repaints immediately with no fade.
  - In Settings, the selected mode segment is a raised segment with a ≥ 3:1 border and heading-coloured text; the selected theme card shows a check mark before its name and a bold name, in addition to its ring.
- **Rules:** a theme is only valid when the contrast checks in `config/themes.spec.ts` pass for both modes. Adding a theme (the CLAUDE.md "To add a theme" steps) now also means providing `--color-control-border` and passing those checks.
- **Out of scope:**
  - Accessible names and selected-state semantics of the theme picker, theme mode switch and profile swatches (`aria-pressed`, radio roles): `accessible-control-names.spec.md`.
  - The new switch component and the checkbox's shape: `settings-switch-toggles.spec.md` (this spec only sets the checkbox's border token, see Parallel work).
  - Decorative waves and gradients behind dashboard content: `quiet-dashboard-background.spec.md`.
  - Colours that are not theme tokens and not avatar colours: chart colours (`--color-chart-*`), priority and tag swatches (`--priority-*`), diagram cell colours. They are graphics, not text, and keep their current values.
  - `prefers-contrast: more` / forced-colors modes: not part of the critique.
  - Disabled controls: WCAG exempts them; their `opacity` treatments stay.

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. CSS custom properties in the existing theme files, Karma + Jasmine with `getComputedStyle` (the test build already includes `src/themes/*.css` through the `test` target's `styles` array in `angular.json`), `requestAnimationFrame`.

## 2.2 Structure

### New token `--color-control-border`

The border of a control a user types into or picks from. `--color-input-border` stays as the quiet border for cards, panels, rows, tabs and dividers (it is used by about 50 rules, most of them decorative, and raising it everywhere would make every card heavy).

- `frontend/src/app/config/themes.ts`: add `'--color-control-border'` to `THEME_TOKENS` right after `'--color-input-border-focus'`.
- Every theme file: add `--color-control-border: <value>;` in both the `[data-mode='dark']` and `[data-mode='light']` blocks, on the line after `--color-input-border-focus`. Values in the table below.

### Target token values

Computed by holding each colour's OKLCH hue and chroma and moving lightness until the worst surface reaches the target (4.6:1 for text, 3.05:1 for control borders, a small margin over the 4.5 / 3.0 floors). "Surfaces" are `--color-card-bg`, `--color-card-bg-alt`, `--color-input-bg` composited over `--color-card-bg`, every colour stop of `--page-background` and `--dashboard-background`, and every stop of `--sidebar-background` and `--header-background` composited over each `--dashboard-background` stop. Primary-light is checked against card, card-alt and input. Only the listed tokens change; every other token keeps its value.

| Theme | Mode | Token | Old | New | Worst ratio after |
|---|---|---|---|---|---|
| purple_haze | dark | `--color-text-faint` | `#8a86b1` | `#a6a2cf` | 4.61 |
| purple_haze | dark | `--color-text-muted` | `#a9a3d1` | `#aba5d3` | 4.80 |
| purple_haze | dark | `--color-primary-light` | `#9c6bff` | `#af7fff` | 4.60 |
| purple_haze | dark | `--color-primary-gradient` | `linear-gradient(90deg, #5a2fe6 0%, #9c6bff 100%)` | `linear-gradient(90deg, #5a2fe6 0%, #8955e8 100%)` | white 4.64 |
| purple_haze | dark | `--color-control-border` | (new) | `#877fb7` | 3.05 |
| purple_haze | light | `--color-text-faint` | `#6e6799` | `#585080` | 4.61 |
| purple_haze | light | `--color-text-muted` | `#574e85` | `#554c83` | 4.82 |
| purple_haze | light | `--color-primary-light` | `#8a55f5` | `#8049e8` | 4.61 |
| purple_haze | light | `--color-primary-gradient` | `linear-gradient(90deg, #5a2fe6 0%, #8a55f5 100%)` | `linear-gradient(90deg, #5a2fe6 0%, #8049e8 100%)` | white ≥ 4.6 |
| purple_haze | light | `--color-control-border` | (new) | `#756d8a` | 3.07 |
| midnight_purple | dark | `--color-control-border` | (new) | `#6d6985` | 3.09 |
| midnight_purple | light | `--color-text-faint` | `#716b8a` | `#6c6685` | 4.67 |
| midnight_purple | light | `--color-primary-light` | `#8b6cf0` | `#7453d4` | 4.60 |
| midnight_purple | light | `--color-control-border` | (new) | `#8a8696` | 3.05 |
| graphite | dark | `--color-text-faint` | `#7d818b` | `#848892` | 4.65 |
| graphite | dark | `--color-control-border` | (new) | `#686a70` | 3.05 |
| graphite | light | `--color-text-faint` | `#6b6f78` | `#6a6e77` | 4.65 |
| graphite | light | `--color-primary-light` | `#6e78e0` | `#5c64ca` | 4.63 |
| graphite | light | `--color-control-border` | (new) | `#8b8c90` | 3.06 |
| coffee | dark | `--color-control-border` | (new) | `#716a64` | 3.07 |
| coffee | light | `--color-text-faint` | `#7a6f63` | `#74695d` | 4.64 |
| coffee | light | `--color-primary-light` | `#cf7440` | `#aa5219` | 4.63 |
| coffee | light | `--color-control-border` | (new) | `#8f877d` | 3.07 |
| teal_ocean | dark | `--color-control-border` | (new) | `#617e83` | 3.07 |
| teal_ocean | light | `--color-text-faint` | `#5d7877` | `#526d6c` | 4.62 |
| teal_ocean | light | `--color-primary-light` | `#2fb5a3` | `#007767` | 4.61 |
| teal_ocean | light | `--color-control-border` | (new) | `#7d8786` | 3.06 |
| terminal | dark | `--color-control-border` | (new) | `#64685e` | 3.07 |
| terminal | light | `--color-text-faint` | `#6a685c` | `#676559` | 4.60 |
| terminal | light | `--color-primary-light` | `#c27a1a` | `#985300` | 4.62 |
| terminal | light | `--color-nav-active-text` | `#a35c00` | `#985200` | 4.66 |
| terminal | light | `--color-control-border` | (new) | `#838176` | 3.07 |
| paper | dark | `--color-control-border` | (new) | `#777670` | 3.07 |
| paper | light | `--color-text-faint` | `#77736a` | `#69655c` | 4.61 |
| paper | light | `--color-control-border` | (new) | `#84827b` | 3.05 |
| winter_forest | dark | `--color-control-border` | (new) | `#64707e` | 3.06 |
| winter_forest | light | `--color-text-faint` | `#6a7586` | `#5f6a7b` | 4.66 |
| winter_forest | light | `--color-primary-light` | `#4f8bc9` | `#306ca8` | 4.66 |
| winter_forest | light | `--color-control-border` | (new) | `#84878d` | 3.06 |
| nature | dark | `--color-text-faint` | `#8e9b8f` | `#909d91` | 4.62 |
| nature | dark | `--color-control-border` | (new) | `#737d74` | 3.06 |
| nature | light | `--color-text-faint` | `#66726a` | `#5e6961` | 4.60 |
| nature | light | `--color-primary-light` | `#5a8a6b` | `#417053` | 4.65 |
| nature | light | `--color-control-border` | (new) | `#80857c` | 3.07 |

Already passing and unchanged (checked): `--color-text-heading` everywhere (≥ 10.7), `--color-text-muted` outside Purple haze, `--color-on-primary` on `--color-primary` (≥ 4.89), the semantic `--color-success|info|warning|error` on their `-bg` and on cards (≥ 4.68), `--color-input-border-focus` as a focus indicator (≥ 3.76), tooltips. Purple haze dark `--color-input-border-focus` is `var(--color-primary-light)` and follows the new value. Purple haze dark `--color-nav-active-bg` is `var(--color-primary-gradient)` and so gets the new gradient.

If the test from block B reports a pair below its floor for one of these values (for example because the browser composites a gradient differently from the calculation), adjust only that value by the smallest lightness step that passes, keeping the hue, and update the table in this spec.

### Contrast test helper (`frontend/src/app/testing/contrast.ts`, new)

Pure functions, test-only (next to the other shared spec helpers in `testing/`):

- `interface Rgba { r: number; g: number; b: number; a: number }` (r, g, b 0–255, a 0–1).
- `parseColor(value: string): Rgba | null`: accepts `#rgb`, `#rrggbb`, `rgb(r, g, b)` and `rgba(r, g, b, a)` (with or without spaces), returns `null` for anything else (`transparent` returns `{r: 0, g: 0, b: 0, a: 0}`).
- `colorStops(value: string): Rgba[]`: every colour inside a token value, in order. A plain colour returns one entry; `linear-gradient(...)` / `radial-gradient(...)` return their stops (ignore positions, angles and `circle at 20% 20%`).
- `composite(foreground: Rgba, background: Rgba): Rgba`: source-over alpha compositing onto an opaque background, result `a: 1`.
- `relativeLuminance(color: Rgba): number`: WCAG 2.x formula (sRGB channel `c/255`, `c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4`, weights 0.2126 / 0.7152 / 0.0722).
- `contrastRatio(a: Rgba, b: Rgba): number`: `(L1 + 0.05) / (L2 + 0.05)` with L1 the lighter.
- `worstContrast(foreground: Rgba, backgrounds: Rgba[]): number`: the minimum ratio over the list.

`frontend/src/app/testing/contrast.spec.ts` (new): black on white is 21; `#777777` on white is 4.48 (to two decimals); `rgba(0, 0, 0, 0.5)` composited on white is `#808080` and 3.95:1 against white; `colorStops('radial-gradient(circle at 20% 20%, #1b1042 0%, #07040f 100%)')` returns the two colours; `colorStops('rgba(255, 255, 255, 0.06)')` returns one colour with `a: 0.06`; `parseColor('#abc')` equals `parseColor('#aabbcc')`.

### Contrast checks (`frontend/src/app/config/themes.spec.ts`)

Keep the existing "provides every token" test. Add `describe('theme contrast')` that, for every `THEMES` key and both modes, sets `data-theme` / `data-mode` on a test element, reads tokens with `getComputedStyle(element).getPropertyValue(token).trim()` and builds the surfaces exactly as described above. Each `it` names the theme, mode and pair, and its expectation message names the surface and the measured ratio (e.g. ``expect(ratio).withContext(`paper light --color-text-faint on card-bg-alt`).toBeGreaterThanOrEqual(4.5)``). Pairs and floors:

1. `--color-text-heading`, `--color-text-muted`, `--color-text-faint` on all surfaces: ≥ 4.5.
2. Hierarchy kept: on `--color-card-bg`, muted's ratio ≥ faint's ratio.
3. `--color-primary-light` on card, card-alt and input: ≥ 4.5.
4. `--color-on-primary` on `--color-primary` and on every stop of `--color-primary-gradient`: ≥ 4.5.
5. `--color-nav-active-text` on every stop of `--color-nav-active-bg` composited over every sidebar surface: ≥ 4.5.
6. `--color-control-border` on card, card-alt, input, page, dashboard and header surfaces: ≥ 3.
7. `--color-input-border-focus` on card and input: ≥ 3.
8. `--color-success|info|warning|error` on their `-bg` composited over the card, and on the card: ≥ 4.5.
9. `--color-tooltip-text` on `--color-tooltip-bg`: ≥ 4.5.

### Avatar colours (`frontend/src/app/config/avatarColors.ts`)

Keys are what the backend stores, so they stay; only the frontend `hex` / `textColor` change:

| Key | Old | New | Ratio |
|---|---|---|---|
| red | `#E53935`, light text (4.23) | `#D32F2F`, light text | 4.98 |
| orange | `#FB8C00`, light text (2.37) | `#FB8C00`, `DARK_TEXT` | 6.79 |
| green | `#43A047`, light text (3.30) | `#43A047`, `DARK_TEXT` | 4.88 |
| blue | `#1E88E5`, light text (3.68) | `#1976D2`, light text | 4.60 |
| cyan | `#00ACC1`, `DARK_TEXT` | unchanged | 5.88 |
| every other colour | unchanged | unchanged | ≥ 7.0 |

(Cyan already uses `DARK_TEXT`; listed so the check is complete.) `frontend/src/app/config/avatarColors.spec.ts` (new): every `AVATAR_COLORS` entry's `textColor` on its `hex` is ≥ 4.5 using `testing/contrast.ts`. `frontend/src/app/utils/mentionChip.spec.ts`: the person-chip expectation uses `'#E53935'`; change it to `'#D32F2F'`.

### Control borders

Switch `border` / `border-color` from `var(--color-input-border)` to `var(--color-control-border)` in exactly these rules (their `:focus` rules keep `--color-input-border-focus`):

- `frontend/src/styles.css`: `.authField input`, `.textInput` (covers every field using the shared class, including `MentionTextEditorComponent`, global search and the ticket/template/profile fields).
- `components/create-named-item-dialog/create-named-item-dialog.component.css`: `.createNamedItemDialog__input`.
- `components/delete-project-dialog/delete-project-dialog.component.css`: `.deleteProjectDialog__input`.
- `components/dropdown/dropdown.component.css`: `.dropdown__trigger`.
- `components/ticket-filter/ticket-filter.component.css`: `.ticketFilter__trigger`.
- `components/ticket-assignees/ticket-assignees.component.css`: `.ticketAssignees__search`.
- `components/rich-text-editor/rich-text-editor.component.css`: `.richTextEditor__host` (the editor box; the toolbar keeps `--color-input-border`).
- `pages/dashboard/document-pages/document-pages.component.css`: `.pagesView__search`; `pages/dashboard/diagrams/diagrams.component.css`: `.diagramsView__search`; `pages/dashboard/projects/projects.component.css`: `.projects__search`; `pages/dashboard/list-tab/list-tab.component.css`: `.listTab__search`.
- `components/emoji-picker/emoji-picker.component.css`: `--input-border-color: var(--color-control-border);` (keep `--border-color` on `--color-input-border`).
- `components/checkbox/checkbox.component.css`: the box's unchecked `border` (today `.checkbox__circle`; see Parallel work).
- After those, grep `frontend/src` for other rules that draw the resting border of an `input`, `textarea`, `select`-like trigger or contenteditable box with `--color-input-border` and switch them too. Do not switch cards, panels, dialogs, rows, tabs, dividers, toolbars, dashed "add" buttons or `.button--ghost` / `.authButton--secondary` (buttons are identified by their label).

### Placeholders (`frontend/src/styles.css`)

- Add next to `.textInput`:
  ```css
  input::placeholder,
  textarea::placeholder {
    color: var(--color-text-faint);
    opacity: 1;
  }
  ```
  (`opacity: 1` because Firefox dims placeholders by default.)
- Remove the now redundant rules: `.authField input::placeholder` (styles.css), `.createNamedItemDialog__input::placeholder`, `.pagesView__search::placeholder`, `.diagramsView__search::placeholder`, `.projects__search::placeholder`. Tiptap placeholders (`.mentionTextEditor__placeholder`) and the emoji picker's `--input-placeholder-color` already use `--color-text-faint` and stay.

### Instant theme switch

- `frontend/src/app/utils/themeDom.ts`: export `THEME_SWITCHING_ATTRIBUTE = 'data-theme-switching'`.
- `frontend/src/app/services/theme.service.ts`, `render()`: before `applyThemeAttributes`, set the attribute on `document.documentElement`; after it, remove the attribute two animation frames later (`requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute(...)))`), so the first frame's style recalculation happens with transitions off.
- `frontend/src/styles.css`, next to the `:root` transition tokens' first use (after `body`):
  ```css
  [data-theme-switching] *,
  [data-theme-switching] *::before,
  [data-theme-switching] *::after {
    transition: none !important;
  }
  ```
- `components/item-tree/item-tree.component.css`: the two rules that use the property-less shorthand `transition: var(--transition-fast);` followed by `transition-property` (`.itemTree__row` and `.itemTree__rootDropZone`) become single explicit lists: `transition: background var(--transition-fast), border-color var(--transition-fast);` and `transition: height var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);`.
- Before changing anything, reproduce the slow fade in the running app (Settings, switch Purple haze → Paper) with DevTools' Animations panel and note which elements animate and through which rule; record the finding as a dated line under decision 9. If a rule with `transition: all` or a property-less `transition` shorthand turns up outside item-tree, make it an explicit list too.

### Selected state in Settings

- `components/theme-mode-switch/theme-mode-switch.component.css`: `.themeModeSwitch__option` gets `border: 1px solid transparent` (so selection doesn't shift layout). `.themeModeSwitch__option--active` becomes `background: var(--color-card-bg); border-color: var(--color-control-border); color: var(--color-text-heading);` (no longer the nav-active tokens). Font weight stays 500 for every segment so widths don't change.
- `components/theme-picker/theme-picker.component.html`: inside `.themePicker__name`, before the phrase, add `<app-icon *ngIf="option.key === theme" class="themePicker__check" name="check" aria-hidden="true"></app-icon>`; import `IconComponent` and `NgIf` in `theme-picker.component.ts`.
- `components/theme-picker/theme-picker.component.css`: `.themePicker__name` becomes `display: flex; align-items: center; gap: var(--space-1);`; add `.themePicker__check { width: 14px; height: 14px; color: var(--color-input-border-focus); }` and `.themePicker__card--selected .themePicker__name { font-weight: 600; }`. The existing selected ring stays.
- Specs: `theme-picker.component.spec.ts` gets a test that only the selected card contains `.themePicker__check`; `theme-mode-switch.component.spec.ts` needs no change (class names stay).

### Docs

`CLAUDE.md`, Frontend > Themes: say form controls (inputs, textareas, editor boxes, dropdown triggers, checkboxes) use `--color-control-border` and decorative borders use `--color-input-border`; that `config/themes.spec.ts` also checks WCAG contrast of the token pairs with the helpers in `testing/contrast.ts` (text 4.5:1, control borders 3:1); that `ThemeService` sets `data-theme-switching` on `<html>` for two frames so a theme change never animates; and add "provide `--color-control-border` and pass the contrast checks" to the "To add a theme" steps. In the Structure tree's `testing/` line, mention `contrast.ts`.

### Parallel work

- **settings-switch-toggles** rewrites `checkbox.component.*` (round circle → square box, class `.checkbox__box`) and adds `components/switch/`. Whichever lands second reconciles: if that spec has merged, put `--color-control-border` on `.checkbox__box`'s and `.switch__track`'s unchecked border instead of `.checkbox__circle`; if not, change `.checkbox__circle` only. That spec is told to use `--color-control-border` when it exists.
- **accessible-control-names** edits `theme-picker.component.html` and `theme-mode-switch.component.html` (ARIA semantics, possibly `role="radiogroup"` / `role="radio"` / `aria-checked`) and the profile swatches. This spec only adds the check icon inside `.themePicker__name` and changes CSS; keep the other attributes as that spec leaves them, and if it renames `--active` / `--selected` classes, apply the CSS above to the new class names.
- **ui-copy-consistency** edits `.authButton` in `styles.css`; **announced-status-messages** edits `.authStatus` in `styles.css`. This spec edits `.authField input`, `.textInput`, removes `.authField input::placeholder`, and adds the placeholder and theme-switching rules. Add new rules next to the related existing ones, not at the end of the file.
- **quiet-dashboard-background** keeps the wave tokens; this spec doesn't touch them.
- **accessible-control-names** also edits the Pages/Diagrams search inputs' HTML; this spec only edits their CSS.
- **dialog-accessibility** edits the create-named-item and delete-project dialogs' templates and TS; this spec only changes one border line and removes one placeholder rule in their CSS.
- **global-search-polish** edits `global-search.component.*`; nothing there changes here (its input uses `.textInput`).
- `CLAUDE.md` is edited by several specs; change only the Themes section and the `testing/` line.

## 2.3 Decisions

1. **Floors: WCAG AA, 4.5:1 for all text tokens, 3:1 for control borders and focus** (2026-11-04). Reason: Impeccable craft-floor "body and placeholder text ≥4.5:1", colorize.md table (body 4.5, controls/focus 3), WCAG 1.4.3 and 1.4.11. Faint text is mostly 12–13px, never "large text", so 3:1 doesn't apply. Rejected: AAA 7:1 (would collapse muted and faint into heading).
2. **Check against every surface a token sits on, including translucent sidebar and header** (2026-11-04). Reason: Impeccable colorize.md "Verify computed foreground/background pairs … overlays"; the worst real case (Favorites empty text on the Purple haze sidebar) is on a translucent surface. Cost: Purple haze dark faint (`#a6a2cf`) and muted (`#aba5d3`) end up close; hierarchy there leans on size and weight. Rejected: darkening the Purple haze sidebar/header instead (changes the theme's identity; Impeccable polish.md "refinement preserves").
3. **Adjust lightness in OKLCH, keep hue and chroma** (2026-11-04). Reason: Impeccable colorize.md "prefer OKLCH because lightness and chroma can be adjusted predictably"; each theme keeps its character. Values target 4.6 / 3.05 for a small margin over the floor so rounding in the browser can't fail the test.
4. **New `--color-control-border` instead of raising `--color-input-border`** (2026-11-04). Reason: WCAG 1.4.11 needs the boundary of a text field (its only visual identifier) at 3:1, but cards, panels and dividers don't, and Impeccable operate.md asks for restraint ("precision and restraint", heavy borders everywhere would be noise). One new semantic token keeps roles explicit (colorize.md "Build roles, not a bag of swatches"). Applied in both modes: colorize.md "Check … both themes", WCAG has no mode exception, and the critique's light-mode finding is the same failure in dark mode. Rejected: raising `--color-input-border` (every card and row gets a dark outline); background-contrast only (the input fills are 1.0–1.2:1 from their surfaces).
5. **`--color-primary-light` must pass as text in light modes** (2026-11-04). Reason: it is used as text (links, mention chips, search highlights, filter and assignee actions); 2.35:1 fails WCAG 1.4.3. The name stays (renaming touches every theme and ~25 rules for no user benefit); in light modes it now is a slightly lighter or equal tone of the accent rather than a pastel. Rejected: switching those text rules to `--color-primary` (Purple haze dark primary is 2.68:1 on cards, so dark mode would get worse).
6. **Purple haze gradient end darkened, start kept** (2026-11-04). Reason: white text must pass on every stop (Impeccable craft-floor contrast; the gradient carries primary buttons and the active nav item). Rejected: dark text on the gradient (breaks the theme's look and the shared `--color-on-primary` contract); a solid fill (removes Purple haze's signature).
7. **Avatar colours: pick the better letter colour, darken the hex only when neither passes** (2026-11-04). Reason: smallest visible change for existing users (keys stay, so nothing is migrated); 4.5:1 because letters are 12–16px. Red and Blue move to Material's next shade (`#D32F2F`, `#1976D2`), which still read as the same colour names. Rejected: a text shadow (no measurable contrast gain); one dark letter colour for all (fails on Purple, Brown, Dark grey).
8. **One global `::placeholder` rule** (2026-11-04). Reason: Impeccable craft-floor "Browser surfaces: the parts you did not draw still carry the design … theme them"; one rule covers every current and future input; the five local copies are duplication (polish.md "remove polish-created duplication").
9. **Theme switch: suppress transitions for two frames while the theme attributes change, plus explicit transition lists** (2026-11-04). Reason: the source has no literal `transition: all`; the only property-less shorthands are the two item-tree rules, which are rewritten, but a theme change touches colours on hundreds of elements that legitimately transition colour on hover, and those animations are what make the switch drag. Suppressing transitions during the switch is the established pattern (next-themes' `disableTransitionOnChange`) and guarantees an instant repaint whatever the cause (Impeccable operate.md "Motion conveys state, not decoration … users don't want to watch it load"; 150–250 ms is for interactions, a theme change is not one). Rejected: removing colour transitions app-wide (loses hover feedback); hunting each rule only (fragile, the next component reintroduces it).
10. **Mode switch selected segment: raised card-coloured segment with a control border and heading text** (2026-11-04). Reason: the selected state must be ≥ 3:1 against its neighbours (WCAG 1.4.11 for state); the `--color-control-border` test guarantees that in all 18 combinations, while a primary fill fails in Purple haze dark (2.27:1 against the surfaces). It is the familiar segmented-control look (Impeccable operate.md "earned familiarity"). Weight stays 500 so the segments never change width. Rejected: `--color-nav-active-bg` (the weak state the critique found); primary fill (fails in Purple haze dark).
11. **Theme picker: check icon and bold name on the selected card, ring kept** (2026-11-04). Reason: colour alone can't mark selection when every preview is itself colourful (Impeccable colorize.md "Information conveyed by color also needs text, shape, iconography, or position"; WCAG 1.4.1). Rejected: a stronger ring only (Purple haze's purple preview still competes with it).
12. **Contrast helper lives in `testing/`** (2026-11-04). Reason: only specs use it; `testing/` holds shared spec helpers per CLAUDE.md; production code never needs contrast maths.
13. **`composite` rounds each channel to an integer** (2026-11-04). Reason: browsers paint 8-bit colours, and the known value above (`rgba(0, 0, 0, 0.5)` on white is `#808080`, 3.95:1) only holds when rounded (unrounded 127.5 gives 3.98).

### Decisions to double-check

- **Avatar colours Red and Blue change shade** (`#E53935` → `#D32F2F`, `#1E88E5` → `#1976D2`) and Orange and Green letters turn dark. Every existing user with those colours sees a slightly different avatar; stored values (keys) don't change.
- **New theme token `--color-control-border`** becomes part of the theme contract: every future theme must provide it.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Contrast helper
- [x] A1. Create `frontend/src/app/testing/contrast.ts` with `Rgba`, `parseColor`, `colorStops`, `composite`, `relativeLuminance`, `contrastRatio` and `worstContrast` as described in Part 2.2.
- [x] A2. Create `frontend/src/app/testing/contrast.spec.ts` with the known-value tests from Part 2.2. Run `npm test`; they pass.

### B. Contrast checks (red first)
- [x] B1. Add `describe('theme contrast')` to `frontend/src/app/config/themes.spec.ts` with the nine pair checks of Part 2.2, but without check 6 yet (the token doesn't exist). Run `npm test` and confirm it fails exactly on the pairs Part 1 lists (faint in 13 combinations, primary-light in light modes, Purple haze gradient, Terminal light nav item). This proves the test measures what the critique measured. Result (2026-11-04): 23 failing checks, all on pairs the table changes; text tokens fail in 12 combinations, because Graphite light and Nature dark faint text already reach 4.5:1 and their table values only add the 4.6 margin.

### C. Token values
- [ ] C1. Add `'--color-control-border'` to `THEME_TOKENS` in `config/themes.ts` after `'--color-input-border-focus'`.
- [ ] C2. Update all nine files in `frontend/src/themes/` with the values from the Part 2.2 table, adding `--color-control-border` on the line after `--color-input-border-focus` in both mode blocks.
- [ ] C3. Add check 6 (control border) to the contrast tests. Run `npm test`; every contrast and token test passes. If one value fails in the browser, adjust it as Part 2.2 describes and update the table in this spec.

### D. Using the tokens
- [ ] D1. Switch the control-border rules listed in Part 2.2 (styles.css `.authField input` and `.textInput`, the component rules, the emoji picker variable, the checkbox's unchecked border per Parallel work), then grep for remaining text-field borders as described and switch those that qualify.
- [ ] D2. Add the global `input::placeholder, textarea::placeholder` rule to `styles.css` next to `.textInput`, and delete the five local placeholder rules named in Part 2.2.
- [ ] D3. Check the style budget: `npm run build` shows no component style over 4kB.

### E. Avatar colours
- [ ] E1. Change red, orange, green and blue in `config/avatarColors.ts` as in Part 2.2; update `utils/mentionChip.spec.ts`'s expected red.
- [ ] E2. Add `config/avatarColors.spec.ts`: every colour's letter is ≥ 4.5:1 on its background (using `testing/contrast.ts`).

### F. Instant theme switch
- [ ] F1. Reproduce the slow fade in the running app as described in Part 2.2 and add the finding as a dated line under decision 9 in this spec.
- [ ] F2. Add `THEME_SWITCHING_ATTRIBUTE` to `utils/themeDom.ts`, set and remove it in `ThemeService.render()`, and add the `[data-theme-switching]` rule to `styles.css`.
- [ ] F3. Rewrite the two `item-tree.component.css` transition shorthands as explicit lists (and any other property-less or `all` transition F1 found).
- [ ] F4. Add to `services/theme.service.spec.ts`: after `preview(...)` the root has `data-theme-switching`; after two `await new Promise(requestAnimationFrame)` it doesn't; the `data-theme` and `data-mode` values are set while the attribute is present. Restore the attribute in `afterEach` like the existing theme attributes.

### G. Selected state in Settings
- [ ] G1. Update `theme-mode-switch.component.css` as in Part 2.2.
- [ ] G2. Add the check icon to `theme-picker.component.html` / `.ts` and the CSS rules to `theme-picker.component.css`; add the "only the selected card has a check" test to `theme-picker.component.spec.ts`.

### H. Docs
- [ ] H1. Update `CLAUDE.md` (Themes section and the `testing/` line) as described in Part 2.2.

### Z. Wrap-up
- [ ] Z1. Full test runs (`npm test` in `frontend/`, `bin/rails test` in `backend/`) and `npm run build`; run `/Users/edgarsskrabins/.claude/skills/impeccable/scripts/impeccable detect --json frontend/src/themes frontend/src/styles.css frontend/src/app/components/theme-picker frontend/src/app/components/theme-mode-switch` once and fix real findings.
- [ ] Z2. Manual check in the running app at 1280px, in Purple haze dark, Purple haze light, Paper light, Teal ocean light and Terminal light: the Favorites empty text in the sidebar and caps labels in a popup panel read clearly; the Pages search field, global search, a ticket title field and a Settings dropdown show a clear edge and a readable placeholder; a primary button and the active sidebar item in Purple haze read clearly; a mention link and "Load more" are readable in Teal ocean light; letter avatars in red, orange, green and blue read clearly (Profile → colour swatches); in Settings, switching theme and mode repaints at once with no fade, the selected mode segment is obvious in Paper light, and the selected theme card shows the check. Spot-check one screen at 375px.
