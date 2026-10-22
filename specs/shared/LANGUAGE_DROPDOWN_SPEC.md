# Language dropdown — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-22

# Part 1 — Business logic and usage

The language switcher in the dashboard header is a row of flag buttons for English and Latvian. That doesn't scale, so it becomes a dropdown. The dropdown is also added to the screens before the dashboard, so people can switch language before logging in. Nine languages are added: Estonian, Lithuanian, Russian, Swedish, Finnish, German, Danish, French and Spanish.

- **Users:** everyone, including people who aren't logged in.
- **Usage:**
  - **Header:** the language switcher is the shared dropdown (`app-dropdown`). The closed dropdown shows the current language's flag and native name, e.g. "🇩🇪 Deutsch". The open list shows every language the same way, with a checkmark on the current one.
  - **Order:** English first, then alphabetically by native name: Dansk, Deutsch, Eesti, Español, Français, Latviešu, Lietuvių, Suomi, Svenska, Русский.
  - **Auth screens:** the same dropdown sits in the top-right corner of the screen, outside the card, on every screen that uses the auth card: login, register, team selection, create team and join team. The card's own corner keeps its Login/Register link.
  - **Switching:** picking a language switches the whole app immediately, and the choice is remembered on this browser, as it is today.
  - **First visit:** the browser's language is used when it's supported, otherwise English, as today. Visitors whose browser is set to one of the new languages get it automatically.
- **Rules:** every language has a complete translation file with exactly the same keys as `en.json`.
- **Out of scope:**
  - Saving the language to the user's account (it stays in `localStorage`).
  - Translating backend or user content.
  - Date and number formatting per locale.
  - A native-speaker review of the new translations, which can happen later.

# Part 2 — Technical details

## 2.1 Tools and libraries
ngx-translate with the http loader, as today, and `app-dropdown` from `PROJECT_SELECTOR_DROPDOWN_SPEC.md`. No new dependencies.

## 2.2 Structure

**`config/translationConfig.ts`:** `supportedTranslations` gets `et`, `lt`, `ru`, `sv`, `fi`, `de`, `da`, `fr` and `es`.

**`config/languageOptions.ts`:** `languageOptions` in the order from Part 1:

| code | flag | label |
|---|---|---|
| en | 🇬🇧 | English |
| da | 🇩🇰 | Dansk |
| de | 🇩🇪 | Deutsch |
| et | 🇪🇪 | Eesti |
| es | 🇪🇸 | Español |
| fr | 🇫🇷 | Français |
| lv | 🇱🇻 | Latviešu |
| lt | 🇱🇹 | Lietuvių |
| fi | 🇫🇮 | Suomi |
| sv | 🇸🇪 | Svenska |
| ru | 🇷🇺 | Русский |

**Translation files:** add `public/assets/translations/{et,lt,ru,sv,fi,de,da,fr,es}.json`. Each one:
- has the same nested structure and keys as `en.json`, including `ERRORS.*`
- is fully translated
- keeps placeholders like `{{project}}` unchanged

**`LanguageSwitcherComponent`:**
- The template becomes `<app-dropdown>` with options from `languageOptions`: `{value: code, label: flag + ' ' + label}`.
- `[value]` is the current language, `(valueChange)` calls `handleSelectLanguage`, and `ariaLabel` is a new `LANGUAGE` phrase.
- The flag-row CSS and the `NgFor` and `NgClass` imports are removed.

**`AuthCardComponent`:** add `<app-language-switcher class="authCard__language">` as a sibling before the `.authCard` element in `auth-card.component.html`. `.authCard__language` is `position: fixed; top: var(--space-5); right: var(--space-5);`. Every auth-card screen gets it from this one change.

**Phrases:** `LANGUAGE` in `PHRASES` and in all 11 translation files.

## 2.3 Decisions
1. **Translations:** the implementing agent writes complete translations for all nine new languages from `en.json`. They are machine quality, and a native-speaker review is out of scope. English placeholder files were rejected.
2. **Display:** flag plus native name in both the closed dropdown and the list, with English first and the rest alphabetical by native name. A flag-only closed dropdown was rejected.
3. **Auth placement:** fixed in the screen's top-right corner, outside the card. Placing it inside the card corner next to the Login/Register link was rejected.
4. **Auth screens:** all auth-card screens (login, register, team selection, create team, join team), not just login and register.
5. **Shared dropdown:** reuses `app-dropdown`, so its look and keyboard support match the project selector.
6. **Placement mechanism:** added once inside `AuthCardComponent` rather than on each page. (Implementation choice, not one the user asked for.)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Prerequisites: `PROJECT_SELECTOR_DROPDOWN_SPEC.md` (`app-dropdown`) is implemented.

Baseline before starting: frontend `npm test`, 375 of 375 passing.

### A. Languages
- [ ] A1. Add the new codes to `supportedTranslations` and replace `languageOptions` with the table in 2.2.
- [ ] A2. Add `LANGUAGE` to `PHRASES`, `en.json` and `lv.json`.
- [ ] A3. Create `de.json`, `fr.json` and `es.json` as complete translations of `en.json`.
- [ ] A4. Create `da.json`, `sv.json` and `fi.json` as complete translations of `en.json`.
- [ ] A5. Create `et.json`, `lt.json` and `ru.json` as complete translations of `en.json`.
- [ ] A6. Check that every translation file has exactly the same key paths as `en.json` and that every `{{placeholder}}` is kept, with a one-off `node` script run from `frontend/` (not committed). Fix any differences.
- [ ] A7. Extend or add `language.service.spec.ts`: a stored or browser language in the new list is picked up, and an unsupported one falls back to English.

### B. Dropdown
- [ ] B1. Rewrite `LanguageSwitcherComponent` (ts, html, css) as described in 2.2. Add `language-switcher.component.spec.ts`: options follow `languageOptions` order with flag and name, and picking a value calls `LanguageService.setLanguage`.
- [ ] B2. Add the switcher to `AuthCardComponent` with the fixed top-right position.

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`.
- [ ] Z2. Manual check in the running app:
  - On login, register, team selection, create team and join team, the dropdown is in the top-right corner and switching changes the text.
  - In the dashboard header, the dropdown shows the current language and switches correctly.
  - Click through a few screens in German and Russian to spot untranslated or broken text.
