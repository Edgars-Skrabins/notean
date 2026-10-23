# Themes — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-23

# Part 1 — Business logic and usage

Notean has a single look today: a purple, glassy dark style with waves. This spec adds **themes** as a personal setting. Each user picks one of nine themes and a **mode** (System, Light or Dark). Every theme has a light and a dark variant. In System mode the app follows the operating system's light/dark preference, live.

A theme supplies only design values: colours, backgrounds, background decoration, borders, shadows, corner radii, fonts, spacing and control heights. Layout, structure and text are the same in every theme. Each theme provides its own complete set of values, so adding or tweaking a theme means editing one file.

The visual reference for every theme and mode is the design canvas **[Notean style concepts](https://claude.ai/artifact/Hh6qR7rW6V6MvU1xBHTR2A)**. Where the canvas and this spec differ, this spec wins. The concept names on the canvas map to the final names like this:

| Theme (final name) | Key | Canvas boards (dark / light) |
|---|---|---|
| Purple haze | `purple_haze` | `Main` / `MainLight` (today's look) |
| Midnight purple | `midnight_purple` | `MidnightViolet` / `MidnightVioletLight` |
| Graphite | `graphite` | `Graphite` / `GraphiteLight` |
| Coffee | `coffee` | `Dusk` / `DuskLight` |
| Teal ocean | `teal_ocean` | `DeepTeal` / `DeepTealLight` |
| Terminal | `terminal` | `Terminal` / `TerminalLight` |
| Paper | `paper` | `PaperDark` / `Paper` |
| Winter forest | `winter_forest` | `NordicFrostDark` / `NordicFrost` |
| Nature | `nature` | `SageDark` / `Sage` |

- **Users:** every logged-in user, for themselves only. A theme never affects other team members.
- **Usage:**
  - **Settings page:** a new **Appearance** section sits above the existing checkboxes.
    - **Mode:** a segmented control with three buttons: System, Light, Dark.
    - **Theme:** a grid of 9 preview cards in the table's order. Each card shows a mini preview of that theme in the currently resolved mode (page background, sidebar strip, a surface, an accent pill and an "Aa" heading sample in the theme's heading font), with the theme name below it. The selected card is outlined.
    - Clicking a mode or a theme **previews it immediately** across the whole app.
    - **Save** (the existing button) persists theme and mode together with the other settings and shows the existing success toast. On failure the existing error toast shows and the preview stays, so the user can retry.
    - Leaving the page with unsaved changes triggers the existing leave-confirm. Leaving without saving (confirming the leave) reverts the app to the saved theme and mode.
    - Changing the mode switches all preview cards to that mode.
  - **System mode:** when the OS switches between light and dark, the app switches immediately, without a reload.
  - **First paint:** the app starts in the theme and mode cached on this device, so there is no flash of the wrong theme while `GET /users/me` loads. When `/users/me` returns a different saved choice (for example one saved on another device), the app switches to it and updates the cache.
  - **Logged out (login, register, team selection pages):** they use the theme and mode last cached on this device. Logging out keeps the cache.
  - **Defaults:** a user who never picked one gets **Purple haze + System**. A device with no cache shows the same.
  - **Diagrams and charts follow the theme:** the diagram editor's shapes, connectors, grid and selection colours and the pie chart's slice colours come from the active theme and update live when it changes. Avatar colours don't change, since users choose them.
  - **Purple haze dark** is today's look. It must look the same as before this spec (after the radius and type changes from the two specs this one builds on).
- **Rules:**
  - The theme must be one of the nine keys and the mode one of `system`, `light`, `dark`. Anything else is rejected with 422 `SETTINGS_UPDATE_FAILED` (the existing settings error).
  - Theme and mode are stored per user and returned with the other settings.
- **Out of scope:**
  - Per-theme layout or wording changes, such as Graphite's search in the sidebar, Teal ocean's inset panels or Terminal's lowercase labels. Themes are tokens only.
  - Per-theme font sizes. The type scale from `header-and-type-scale.spec.md` stays global.
  - Team-wide or admin-enforced themes, and user-made custom themes.
  - Per-theme avatar colours.
  - The Swiss concept from the canvas (set aside).

# Part 2 — Technical details

## 2.1 Tools and libraries

- **CSS custom properties** with attribute selectors for the theme layer. No CSS framework.
- **New dependencies (frontend `dependencies`):** self-hosted fonts from Fontsource, because the CSP only allows `font-src 'self'`. Install the current 5.x version of each and record the exact versions in `package.json`:
  - `@fontsource/geist` (Midnight purple)
  - `@fontsource/inter` (Graphite, Paper body)
  - `@fontsource/manrope` (Coffee)
  - `@fontsource/plus-jakarta-sans` (Teal ocean)
  - `@fontsource/jetbrains-mono` (Terminal headings and UI)
  - `@fontsource/ibm-plex-sans` (Terminal body, Winter forest)
  - `@fontsource/newsreader` (Paper headings)
  - `@fontsource/dm-sans` (Nature)

  The packages are included through the per-weight CSS files (for example `@fontsource/inter/400.css`) in `angular.json` `styles`. The browser downloads a font file only when a rendered element uses it, and each file only for the unicode ranges it needs. Some fonts have no Cyrillic (DM Sans, Newsreader, possibly Plus Jakarta Sans), so Russian text falls back to the next font in the stack. That is accepted.
- **Backend:** no new gems.

## 2.2 Structure

### Backend

- **Migration:** add to `users`:
  - `theme`, string, `null: false`, `default: "purple_haze"`
  - `theme_mode`, string, `null: false`, `default: "system"`
- **`User` model:**
  - `THEMES = %w[purple_haze midnight_purple graphite coffee teal_ocean terminal paper winter_forest nature].freeze`
  - `THEME_MODES = %w[system light dark].freeze`
  - `validates :theme, inclusion: { in: THEMES }` and `validates :theme_mode, inclusion: { in: THEME_MODES }`
- **`ApplicationController#update_settings_params`:** also permit `:theme, :theme_mode`.
- **`UsersController#settings_json`:** add `theme` and `theme_mode`. `GET /users/me` and `PATCH /users/me/settings` both return them. An invalid value already falls into the existing `render_error(ErrorCodes::Users::SETTINGS_UPDATE_FAILED, :unprocessable_entity)` branch.

### Frontend: the token contract

Every theme and mode provides the same set of tokens. `frontend/src/app/config/themes.ts` exports the list as `THEME_TOKENS`, and a test checks it (block D).

**Mode-independent tokens**, set in the theme's base block:

| Token | Meaning |
|---|---|
| `--font-body` | body and content text |
| `--font-heading` | screen, window and section titles, and the brand |
| `--font-ui` | buttons, inputs, tabs, sidebar, menus, labels |
| `--font-heading-weight` | weight of titles |
| `--radius-sm` | controls (from `radius-and-spacing.spec.md`) |
| `--radius-md` | surfaces (from `radius-and-spacing.spec.md`) |
| `--space-1` … `--space-8` | spacing scale |
| `--control-height` | buttons, inputs and dropdown triggers |
| `--control-height-sm` | header controls (from `header-and-type-scale.spec.md`) |
| `--row-height` | item tree and backlog rows (36px literal in `header-and-type-scale.spec.md`) |

**Mode-dependent tokens**, set in the theme's dark and light blocks:

| Token | Meaning |
|---|---|
| `--page-background` | full `background` value of the app and auth pages (can be a gradient). Replaces `--color-page-bg-start/end`. |
| `--header-background`, `--sidebar-background` | header and sidebar backgrounds (can be gradients) |
| `--backdrop-blur` | blur behind header and sidebar (`20px` in Purple haze, `0px` elsewhere) |
| `--page-waves-display` | `block` shows the wave decoration (Purple haze only), `none` hides it |
| `--color-page-wave-1/2/3`, `--color-wave-1/2/3` | wave fills (dashboard/app backdrop, auth card) |
| `--color-card-bg`, `--color-card-bg-alt` | surfaces, and raised or alternate surfaces such as columns |
| `--color-input-bg`, `--color-input-bg-focus`, `--color-input-border`, `--color-input-border-focus` | fields and general borders, focus and selection |
| `--color-primary`, `--color-primary-light`, `--color-primary-gradient` | accent. Every theme except Purple haze sets the gradient to its solid primary. |
| `--color-on-primary` | text and icons on primary backgrounds |
| `--color-nav-active-bg`, `--color-nav-active-text` | active sidebar row and active tab |
| `--color-text-heading`, `--color-text-muted`, `--color-text-faint` | text levels |
| `--color-overlay` | dialog and popup backdrop |
| `--shadow-card`, `--shadow-button` | shadows |
| `--color-success`, `--color-info`, `--color-warning`, `--color-error`, each with `-bg` | status colours |
| `--color-chart-1` … `--color-chart-8` | chart and diagram series colours |

Global, not theme-provided (stay in `styles.css` `:root`): the font-size tokens from `header-and-type-scale.spec.md`, the transitions, and anything else not listed above.

### Frontend: files

```
frontend/src/themes/
├── modes.css            [data-mode='dark'] and [data-mode='light'] defaults
├── purple-haze.css
├── midnight-purple.css
├── graphite.css
├── coffee.css
├── teal-ocean.css
├── terminal.css
├── paper.css
├── winter-forest.css
└── nature.css
```

- **`modes.css`:** the shared values per mode, which themes may override: status colours, chart colours, `--color-overlay`, `--shadow-card`, `--shadow-button`, `--backdrop-blur: 0px`, `--page-waves-display: none` and the wave colours (transparent).
- **Each theme file** has exactly three blocks:
  1. `[data-theme='<key>'] { … }`: every mode-independent token.
  2. `[data-theme='<key>'][data-mode='dark'] { … }`: every mode-dependent token not inherited from `modes.css`, plus any `modes.css` overrides.
  3. `[data-theme='<key>'][data-mode='light'] { … }`: the same for light.
- **Specificity:** blocks 2 and 3 (two attributes) beat `modes.css` (one attribute). Block 1 and `modes.css` never define the same token.
- **Selectors are attribute-only, never `:root`,** so the same tokens can be applied to any element. The preview cards rely on this: they set `data-theme` and `data-mode` on themselves and render with that theme's real tokens.
- **`angular.json`:** in both the `build` and `test` `styles` arrays, after `src/styles.css`, add the Fontsource weight files, then `src/themes/modes.css`, then the nine theme files.
- **`styles.css`:**
  - Remove every token that moves into themes.
  - `body` uses `background: var(--page-background)` and `font-family: var(--font-body)`.
  - Add base rules so headings use `--font-heading` and `--font-heading-weight`, and `button`, `input`, `select` and `textarea` use `--font-ui`.
- **Component CSS:** replace every hardcoded colour (hex, `rgb()`, `rgba()`) with a contract token. There are 69 today across 32 files, and `grep -rE '#[0-9a-fA-F]{3,8}\b|rgba?\(' frontend/src/app --include='*.css'` must return nothing afterwards. Where nothing fits (for example the dashboard's translucent overlays), extend the contract with a new token in `THEME_TOKENS`, `modes.css` or every theme, and note it in the PR description. Header and sidebar use their background tokens and `backdrop-filter: blur(var(--backdrop-blur))`. The wave SVGs in `app.component.html`, `auth-card` and `dashboard` use `display: var(--page-waves-display)`. Primary buttons use `--color-on-primary` for their text. Buttons, inputs and dropdown triggers get `min-height: var(--control-height)`, and item and backlog rows `height: var(--row-height)`.

### Frontend: TypeScript

- **`config/themes.ts`:**
  - `type ThemeKey` (the nine keys) and `type ThemeMode = 'system' | 'light' | 'dark'`
  - `THEMES: { key: ThemeKey, phrase: string }[]` in the order of the table in Part 1
  - `DEFAULT_THEME: ThemeKey = 'purple_haze'` and `DEFAULT_THEME_MODE: ThemeMode = 'system'`
  - `THEME_TOKENS: string[]`, the full contract
- **`utils/themeDom.ts`** (pure helpers, used by `main.ts` and `ThemeService`):
  - `resolveMode(mode, prefersDark): 'light' | 'dark'`
  - `applyThemeAttributes(element, theme, resolvedMode)` sets `data-theme` and `data-mode`
  - `readCachedTheme()` reads `theme` and `themeMode` from `localStorage`, validating them and falling back to the defaults
  - `themeToken(name)` returns the computed value of a token on `document.documentElement`
- **`main.ts`:** before `bootstrapApplication`, read the cache and apply attributes to `document.documentElement` (resolving System with `matchMedia('(prefers-color-scheme: dark)')`). The CSP forbids inline scripts, so this replaces an `index.html` snippet.
- **`services/theme.service.ts`** (`providedIn: 'root'`):
  - `apply(theme, mode)`: sets the attributes, writes the cache, emits.
  - `preview(theme, mode)`: same, without writing the cache.
  - `theme$`: emits `{ theme, resolvedMode }` on every change, including OS changes.
  - It keeps one `matchMedia` change listener that re-applies the current choice while the mode is `system`.
- **Settings model and service:**
  - `UserSettings` gets `theme: ThemeKey` and `themeMode: ThemeMode`.
  - `RawSettings`, `DEFAULT_SETTINGS`, `mapSettings` and the `update` payload get `theme` and `theme_mode`.
  - `SettingsService.update` calls `themeService.apply` on success.
  - `SessionService`, after loading `/users/me`, calls `themeService.apply(settings.theme, settings.themeMode)`.
  - `SessionService.clear()` does **not** touch the theme, so the cache survives logout.
- **Settings page:**
  - New `components/theme-mode-switch/` takes `mode` as `@Input` and emits `modeChange` as `@Output`. It's three `<button>`s with `aria-pressed`.
  - New `components/theme-picker/` takes `theme` and `resolvedMode` as `@Input`s and emits `themeChange` as `@Output`. Each card is a `<button aria-pressed>` with an inner preview element carrying `[attr.data-theme]` and `[attr.data-mode]`, styled only with contract tokens. The name label sits outside that element, so it uses the app's active theme.
  - `SettingsComponent`:
    - Renders both in an Appearance section.
    - On change, updates `settings` and calls `themeService.preview`.
    - In `ngOnDestroy`, calls `themeService.apply(savedSettings.theme, savedSettings.themeMode)` so an unsaved preview is reverted. After a save, `savedSettings` already holds the new values.
    - `hasUnsavedChanges` already compares every key, so it covers the new fields.
- **Diagrams and charts:**
  - **`flowchart-editor.component.ts`:**
    - Replace hardcoded colours with `themeToken(...)` reads:
      - node stroke: `--color-primary-light`
      - node fill: `--color-card-bg`
      - labels: `--color-text-heading`
      - connectors: `--color-text-muted`
      - grid: `--color-input-border`
      - gradient stops: `--color-primary` and `--color-primary-light`
    - Subscribe to `ThemeService.theme$` and update existing cells' attrs and the grid when it emits.
  - **`config/chartColors.ts`:** `chartColor(i)` returns `var(--color-chart-N)`. The pie chart binds it through a style binding, since CSS variables don't resolve in SVG presentation attributes.
- **i18n:** add these to `PHRASES` and every translation file:
  - `APPEARANCE`, `THEME`, `THEME_MODE`, `THEME_MODE_SYSTEM`, `THEME_MODE_LIGHT`, `THEME_MODE_DARK`
  - one phrase per theme: `THEME_PURPLE_HAZE`, `THEME_MIDNIGHT_PURPLE`, `THEME_GRAPHITE`, `THEME_COFFEE`, `THEME_TEAL_OCEAN`, `THEME_TERMINAL`, `THEME_PAPER`, `THEME_WINTER_FOREST`, `THEME_NATURE`

### Theme values

**Font stacks:**
- `system` = `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`
- `mono` = `'JetBrains Mono', ui-monospace, monospace`
- Every named font below is followed by the `system` stack.

**Densities:**

| Density | `--space-1…8` | `--control-height` / `-sm` / `--row-height` |
|---|---|---|
| default | 4, 8, 12, 16, 24, 32, 48, 64 | 36 / 28 / 36 |
| dense | 4, 6, 10, 12, 20, 28, 40, 56 | 32 / 26 / 32 |
| loose | 4, 8, 14, 18, 28, 36, 52, 72 | 40 / 30 / 40 |

**Mode-independent values per theme:**

| Theme | `--font-body` | `--font-heading` | `--font-ui` | heading weight | `--radius-sm` / `-md` | density |
|---|---|---|---|---|---|---|
| Purple haze | system | system | system | 700 | 8 / 12 | default |
| Midnight purple | Geist | Geist | Geist | 600 | 8 / 10 | default |
| Graphite | Inter | Inter | Inter | 600 | 6 / 8 | dense |
| Coffee | Manrope | Manrope | Manrope | 800 | 8 / 10 | default |
| Teal ocean | Plus Jakarta Sans | Plus Jakarta Sans | Plus Jakarta Sans | 700 | 10 / 14 | default |
| Terminal | IBM Plex Sans | mono | mono | 700 | 2 / 2 | dense |
| Paper | Inter | Newsreader, Georgia, serif | Inter | 500 | 4 / 6 | loose |
| Winter forest | IBM Plex Sans | IBM Plex Sans | IBM Plex Sans | 600 | 8 / 10 | default |
| Nature | DM Sans | DM Sans | DM Sans | 700 | 10 / 14 | loose |

Fontsource weights to include:
- 400, 500, 600 and 700 for every font
- plus 800 for Manrope
- Newsreader 400, 500 and 600
- JetBrains Mono 400, 500 and 700

**Colours per theme and mode.** Column keys:
- page = `--page-background`
- header / sidebar = their background tokens
- card / alt = `--color-card-bg` / `--color-card-bg-alt`
- input / input-focus = `--color-input-bg` / `--color-input-bg-focus`
- border / focus = `--color-input-border` / `--color-input-border-focus`
- heading / muted / faint = text levels
- primary / light / on = `--color-primary` / `--color-primary-light` / `--color-on-primary`
- nav = `--color-nav-active-bg` / `--color-nav-active-text`

Purple haze dark is today's `styles.css` and component values moved verbatim (page = `radial-gradient(circle at 20% 20%, #1b1042 0%, #07040f 100%)`; header, sidebar, glow shadows, waves and gradient exactly as today, `--backdrop-blur: 20px`, `--page-waves-display: block`). The dashboard shell's current `linear-gradient(165deg, …)` becomes a separate token only if keeping it differs visibly from `--page-background`.

| Theme · mode | page | header | sidebar | card | alt | input | input-focus | border | focus | heading | muted | faint | primary | light | on | nav bg / text |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Purple haze · light | `linear-gradient(165deg, #F6F3FF 0%, #E6DEFF 100%)` | `linear-gradient(160deg, rgba(156,107,255,.22), rgba(124,82,240,.12))` | `linear-gradient(180deg, rgba(156,107,255,.18), rgba(124,82,240,.06))` | #FFFFFF | #F3EFFF | rgba(255,255,255,.75) | #FFFFFF | rgba(109,62,240,.18) | #6D3EF0 | #1E1442 | #574E85 | #6E6799 | #5A2FE6 | #8A55F5 | #FFFFFF | rgba(255,255,255,.8) / #4A22C9 |
| Midnight purple · dark | #13111C | #13111C | #16131F | #1C1929 | #221E31 | #1C1929 | #221E31 | #2C2840 | #8B6CF0 | #EEEBF7 | #A29DBA | #8F89A8 | #7451E8 | #9B82F2 | #FFFFFF | rgba(139,108,240,.16) / #DCD2FF |
| Midnight purple · light | #FAF9FE | #FFFFFF | #F4F2FB | #FFFFFF | #F0ECFB | #F4F2FB | #FFFFFF | #E6E2F3 | #6D4AE0 | #1D1830 | #5E5878 | #716B8A | #6D4AE0 | #8B6CF0 | #FFFFFF | rgba(109,74,224,.11) / #5333C7 |
| Graphite · dark | #0F1012 | #0F1012 | #0F1012 | #17181B | #1D1F23 | #17181B | #1D1F23 | #26282D | #8C97F7 | #E8E9EC | #8B8F98 | #7C808A | #8C97F7 | #AEB6FA | #0F1012 | #1D1F23 / #F2F3F5 |
| Graphite · light | #FFFFFF | #FFFFFF | #FAFAFB | #FFFFFF | #F4F4F6 | #FFFFFF | #FFFFFF | #E3E4E8 | #4F5BD5 | #17181B | #5F636C | #6B6F78 | #4F5BD5 | #6E78E0 | #FFFFFF | #EEEFF2 / #17181B |
| Coffee · dark | #161412 | #1B1816 | #161412 | #241F1B | #1B1816 | #221E1B | #2A2420 | #342E29 | #E58A4E | #EFE9E2 | #A39A90 | #8F877D | #E58A4E | #F3B48A | #1A120C | #2A2420 / #F3B48A |
| Coffee · light | #FAF7F3 | #FFFFFF | #FAF7F3 | #FFFFFF | #F3EEE7 | #F6F1EA | #FFFFFF | #E8E0D5 | #B4561F | #2A221B | #6F6458 | #7A6F63 | #B4561F | #CF7440 | #FFFFFF | #F6E6D9 / #9A4716 |
| Teal ocean · dark | #081214 | #0D1A1D | #0F1E21 | #12252A | #1A3337 | #12252A | #163035 | #1F3A3F | #2FB5A3 | #E4F1F0 | #8FAFAD | #7F9F9D | #2FB5A3 | #8FE6DA | #06201C | rgba(47,181,163,.13) / #8FE6DA |
| Teal ocean · light | #E1ECEB | #FFFFFF | #F4F8F8 | #F6FAFA | #E2EEEC | #F2F7F7 | #FFFFFF | #DCE8E6 | #0E7F72 | #0F2B2C | #4F6B6A | #5D7877 | #0E7F72 | #2FB5A3 | #FFFFFF | #D9EFEB / #0B6B60 |
| Terminal · dark | #0C0D0B | #0C0D0B | #0C0D0B | #121410 | #1A1A12 | #121410 | #161812 | #2A2D24 | #F0A23B | #E6E4D8 | #9A988B | #8A887C | #F0A23B | #F5BE70 | #14120C | #1A1A12 / #F0A23B |
| Terminal · light | #F7F6F0 | #F7F6F0 | #F1EFE6 | #FFFFFF | #EDE3CF | #FFFFFF | #FFFFFF | #DAD8CC | #A35C00 | #1F1E19 | #5F5D52 | #6A685C | #A35C00 | #C27A1A | #FFFFFF | #EDE3CF / #A35C00 |
| Paper · dark | #1A1A18 | #1A1A18 | #201F1D | #232320 | #2D2C28 | #262522 | #2D2C28 | #34332E | #A8BEDD | #ECEAE3 | #A9A69C | #97948A | #A8BEDD | #C4D4EA | #111A28 | #2D2C28 / #ECEAE3 |
| Paper · light | #FAFAF8 | #FAFAF8 | #F3F2EE | #FFFFFF | #E7E5DE | #FFFFFF | #FFFFFF | #E3E1DA | #1F3A5F | #1E1D1A | #5F5B53 | #77736A | #1F3A5F | #3A5A85 | #FFFFFF | #E7E5DE / #1E1D1A |
| Winter forest · dark | #11161D | #161C24 | #161C24 | #1D2530 | #171E27 | #11161D | #1D2530 | #2A3441 | #6FA3DB | #E3E8EF | #97A3B2 | #8794A4 | #6FA3DB | #9CC3EC | #0B1724 | #1E2D40 / #9CC3EC |
| Winter forest · light | #F3F5F8 | #FFFFFF | #FFFFFF | #FFFFFF | #E9EDF2 | #F3F5F8 | #FFFFFF | #E2E6EC | #2F6FB0 | #1B2330 | #4F5B6B | #6A7586 | #2F6FB0 | #4F8BC9 | #FFFFFF | #EAF1F9 / #24588D |
| Nature · dark | #151A16 | #151A16 | #1A201B | #1F2620 | #263428 | #1F2620 | #252D26 | #2C352D | #8CC29C | #E4EAE3 | #9FAC9F | #8E9B8F | #8CC29C | #A9CFB2 | #102016 | #262E27 / #E4EAE3 |
| Nature · light | #EEF1EC | #EEF1EC | #E3E8E0 | #FBFCFA | #E2EADF | #FBFCFA | #FFFFFF | #DCE2D8 | #3E6B4E | #1F2A22 | #4E5A51 | #66726A | #3E6B4E | #5A8A6B | #FFFFFF | #FBFCFA / #1F2A22 |

**Purple haze light extras:**
- `--backdrop-blur: 20px`, `--page-waves-display: block`
- waves `rgba(156,107,255,.12)`, `rgba(124,82,240,.14)`, `rgba(109,62,240,.18)`
- `--color-primary-gradient: linear-gradient(90deg, #5A2FE6 0%, #8A55F5 100%)`
- `--shadow-card: 0 30px 70px -20px rgba(109,62,240,.25)`, `--shadow-button: 0 10px 25px -8px rgba(109,62,240,.5)`

**`modes.css` values:**

| Token | dark | light |
|---|---|---|
| success / bg | #8EE6A8 / #17332A | #1E7A46 / #E3F4EA |
| info / bg | #9DC4FF / #1A2A4D | #1F5FA8 / #E4EEFA |
| warning / bg | #FFD88A / #3A2F17 | #8A5A00 / #FBF0D9 |
| error / bg | #FF9D9D / #3D1C2B | #B42318 / #FDECEA |
| chart 1–8 | #9C6BFF, #4FC3F7, #81C784, #FFB74D, #F06292, #4DB6AC, #FFD54F, #A1887F | #7C4DDB, #0288D1, #388E3C, #E08600, #D81B60, #00897B, #C49000, #795548 |
| overlay | rgba(0,0,0,.55) | rgba(16,24,40,.35) |
| shadow-card | 0 1px 2px rgba(0,0,0,.3) | 0 1px 2px rgba(16,24,40,.06) |
| shadow-button | none | none |

Contrast: `--color-text-faint` and status text must reach 4.5:1 on `--color-card-bg` in every theme and mode. If one doesn't, darken it (light) or lighten it (dark) until it does, and note the change in the PR description.

## 2.3 Decisions

1. **Storage:** `theme` and `theme_mode` columns on `users`, returned with the other settings, plus a `localStorage` cache (`theme`, `themeMode`) for first paint. localStorage-only was rejected because the choice wouldn't follow the user across devices.
2. **Save flow:** clicking previews live, Save persists, and leaving without saving reverts. Instant-save and save-without-preview were rejected.
3. **Fonts:** self-hosted through `@fontsource/*`, keeping the CSP strict and making no third-party requests. Google Fonts (CSP change) and system-only fonts were rejected.
4. **Default:** Purple haze + System, for new users and for devices with no cache.
5. **Scope:** tokens only, with no per-theme layout or wording. Small per-theme style switches were rejected.
6. **Themes may override:** radii, the spacing scale and control heights (plus fonts and colours). Font sizes stay global.
7. **Diagrams and charts follow the theme**, and update live. Avatar colours stay fixed.
8. **Picker UI:** preview cards rendered with each theme's real tokens, plus a System/Light/Dark segmented control.
9. **Order:** this spec lands after `radius-and-spacing.spec.md` and `header-and-type-scale.spec.md` and makes their tokens theme-provided. Absorbing them, or landing first, was rejected.
10. **Density:** Graphite and Terminal are dense, Paper and Nature loose, the rest default. Values are in the densities table. In loose themes the window outer padding becomes 28px, above the 24px cap from `radius-and-spacing.spec.md`. That is accepted as part of the theme.
11. **Logged-out pages:** use the device's cached theme and mode. Logout keeps the cache.
12. **Theme names:**
    - Purple haze (today's look), Midnight purple, Graphite, Coffee, Teal ocean, Terminal, Paper, Winter forest, Nature.
    - Keys are snake_case, used in the database, the API and the `data-theme` attribute.
    - Names are translated like all other UI text.
13. **Architecture:**
    - Attribute selectors (`data-theme` and `data-mode`) on `<html>`, one CSS file per theme with three blocks, and shared mode defaults in `modes.css`.
    - Attribute-only selectors make the preview cards reuse real tokens.
    - Lazy-loaded per-theme stylesheets were not chosen. All themes together are small CSS, and fonts already load on demand.
14. **No inline boot script:** the CSP blocks inline scripts, so `main.ts` applies the cached theme before bootstrapping.
15. **Swiss** from the canvas is not included.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

**Prerequisites:**
- `radius-and-spacing.spec.md` and `header-and-type-scale.spec.md` must be merged into `master` first. If either isn't, stop and tell the user.
- This spec touches CSS across most components. Before starting, check `git branch -r` and open pull requests for other specs editing component CSS, and ask the user about the order if any are in progress.

Baseline before starting: run `bin/rails test` in `backend/` and `npm test` in `frontend/` and note both counts here.

### A. Backend
- [ ] A1. Migration adding `theme` (default `purple_haze`) and `theme_mode` (default `system`) to `users`, both `null: false`. Run it and commit the updated `db/schema.rb`.
- [ ] A2. `User::THEMES`, `User::THEME_MODES` and the inclusion validations. Model tests: the defaults are valid, and an unknown theme or mode is invalid.
- [ ] A3. Permit `theme` and `theme_mode` in `update_settings_params`, and add both to `settings_json`. Controller tests in `users_controller_test.rb`: `GET /users/me` returns the defaults, `PATCH` with a valid theme and mode saves and returns them, and an invalid value returns 422 `SETTINGS_UPDATE_FAILED` without changing anything.

### B. Theme foundation (frontend)
- [ ] B1. Install the eight `@fontsource/*` packages and add their weight CSS files (Part 2 list) to the `build` and `test` `styles` in `angular.json`.
- [ ] B2. Create `config/themes.ts` (`ThemeKey`, `ThemeMode`, `THEMES`, defaults, `THEME_TOKENS`) and `utils/themeDom.ts` (`resolveMode`, `applyThemeAttributes`, `readCachedTheme`, `themeToken`). Unit tests for `resolveMode` and for `readCachedTheme` falling back on missing or invalid cache values.
- [ ] B3. Create `src/themes/modes.css` and `src/themes/purple-haze.css`. Move every theme-provided token out of `styles.css` into them with today's values (Purple haze dark is verbatim), add the Purple haze light values, and add both files to `angular.json` `styles`.
- [ ] B4. `styles.css`:
  - `body` uses `--page-background` and `--font-body`.
  - Add the base rules for `--font-heading`, `--font-heading-weight` and `--font-ui`.
  - Introduce `--control-height` and `--row-height` usage where Part 2 says.
- [ ] B5. `main.ts` applies the cached theme (or the defaults) to `document.documentElement` before bootstrap.

### C. Tokenize components
- [ ] C1. Header, sidebar, dashboard shell, `app.component` backdrop and auth card: background tokens, `backdrop-filter: blur(var(--backdrop-blur))`, waves with `display: var(--page-waves-display)`, nav active tokens.
- [ ] C2. Replace every remaining hardcoded colour in component CSS with contract tokens (`--color-on-primary` for text on primary, `--color-overlay` for backdrops, and so on). Add any token the contract lacks to `THEME_TOKENS`, `modes.css` and the theme files, and list it in the PR description. Done when the grep in Part 2 returns nothing.
- [ ] C3. Apply `--control-height` to buttons, inputs and dropdown triggers, and `--row-height` to item tree and backlog rows.
- [ ] C4. With Purple haze dark active, compare the app with `master` (login, dashboard home, a page, a diagram, a board, a ticket popup, Settings). It must look the same; fix any drift.

### D. The other eight themes
- [ ] D1. Create `midnight-purple.css`, `graphite.css`, `coffee.css`, `teal-ocean.css`, `terminal.css`, `paper.css`, `winter-forest.css` and `nature.css` with the three blocks each, using the tables in Part 2, and add them to `angular.json` `styles`.
- [ ] D2. Contract test (`config/themes.spec.ts`): for every theme and both modes, an element with those attributes resolves every `THEME_TOKENS` entry to a non-empty value.
- [ ] D3. Check text contrast (Part 2 rule) for each theme and mode, and adjust and note any value that fails.

### E. Theme service and settings data
- [ ] E1. `services/theme.service.ts` with `apply`, `preview`, `theme$` and the System `matchMedia` listener. Tests:
  - `apply` writes the cache and attributes.
  - `preview` doesn't write the cache.
  - System mode re-resolves when the media query changes.
- [ ] E2. Settings data:
  - Add `theme` and `themeMode` to `UserSettings`, `RawSettings`, `DEFAULT_SETTINGS`, `mapSettings` and the `update` payload.
  - `SettingsService.update` calls `themeService.apply` on success.
  - `SessionService` applies the loaded settings' theme, and `clear()` leaves the theme alone.
  - Update the existing service and session specs and add tests for these behaviours.

### F. Settings UI
- [ ] F1. Add the `PHRASES` keys from Part 2 and translate them in every file in `public/assets/translations/`.
- [ ] F2. `components/theme-mode-switch/` (`npm run newcomponent theme-mode-switch`): segmented System/Light/Dark buttons with `aria-pressed`, using `@Input() mode` and `@Output() modeChange`. Test that it emits on click.
- [ ] F3. `components/theme-picker/`: 9 preview-card buttons, each with an inner element carrying `data-theme` and `data-mode` and styled only with contract tokens, the name label outside, and the selected card outlined. Uses `@Input() theme`, `@Input() resolvedMode` and `@Output() themeChange`. Test that it renders 9 cards and emits the clicked key.
- [ ] F4. `SettingsComponent`:
  - An Appearance section above the checkboxes with both components.
  - Preview on change.
  - Revert to the saved theme in `ngOnDestroy`.
  - Tests: changing the theme marks unsaved changes and previews, save sends theme and mode, and destroying without saving re-applies the saved theme.
- [ ] F5. Keep component styles under the 4kB budget (`npm run build`).

### G. Diagrams and charts
- [ ] G1. `flowchart-editor.component.ts`: replace hardcoded colours with `themeToken` reads (Part 2 mapping), and on `ThemeService.theme$` update existing cells and the grid. Unsubscribe on destroy.
- [ ] G2. `chartColors.ts` returns `var(--color-chart-N)`, and `pie-chart` applies it through a style binding. Update the affected specs.

### Z. Wrap-up
- [ ] Z1. Update `CLAUDE.md`:
  - frontend structure: the `src/themes/` folder, `ThemeService`, `themeDom`, `config/themes.ts`
  - a short "Themes" section on the token contract and how to add a theme
  - backend: the `users.theme` and `users.theme_mode` settings
  - the new Fontsource dependencies in the tech stack
- [ ] Z2. Run `bin/rails test`, `bin/rubocop` and `bin/brakeman` in `backend/`, and `npm test` and `npm run build` in `frontend/`.
- [ ] Z3. Manual check in the running app:
  - In Settings, switch through all 9 themes in Light and in Dark.
  - Check the header, sidebar, home, pages list, an open page, a diagram (shapes and grid recolour live), a board, a ticket popup, dialogs, toasts and the pie chart.
  - Switch the OS appearance while in System mode and confirm the app follows live.
  - Preview a theme, leave without saving, and confirm it reverts.
  - Save, reload, and confirm there is no flash of the wrong theme.
  - Log out and confirm the login page keeps the theme.
  - Check at 375px width.
