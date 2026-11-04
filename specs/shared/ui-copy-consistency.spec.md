# UI copy consistency — Spec

**Type:** bug fix
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

The UX critique of 2026-11-04 (Nielsen #4 consistency, scored 2/4) found three copy defects:

1. **ALL CAPS buttons.** Every `.authButton` (`frontend/src/styles.css`, `text-transform: uppercase; letter-spacing: 0.06em`) shouts its label: "SAVE", "CHANGE PASSWORD", "LOGIN", "CREATE A TEAM", "JOIN A TEAM", "SWITCH TEAMS", "GO HOME", "CONTINUE", "REGISTER". Every other button in the app (`app-button`, dialogs, menus) is sentence case, so the same action ("Save") looks different on Settings, Profile and Manage team than in a dialog. Reproduce: open Settings, Profile or the login page.
2. **Nouns used as verbs.** The login button and the register page's "back to login" link say "Login", and the account menu says "Logout". The actions are "Log in" and "Log out"; the app's own messages already say "log in again" (`ERRORS.COMMON.UNAUTHORIZED`, `CONFIRM_DELETE_ACCOUNT`). Once the caps are gone the noun form shows.
3. **Wrong plurals.** Count strings are hard-coded plurals: the Projects list shows "1 members" (`MEMBER_COUNT`, `en.json`), a Kanban card with one file is labelled "1 attachments", the bulk delete confirm says "Move 1 tickets to the trash?", a diagram comment pin says "Replies: 1". Where a singular exists it is an English-only `count === 1` switch (`TRASH_DAYS_LEFT_ONE`, `TRASH_ITEMS_INSIDE_ONE`, `CONFIRM_DELETE_PRIORITY_ONE`, `CONFIRM_DELETE_TAG_ONE`), which is wrong in Latvian ("21 dienas" needs the singular form), Lithuanian and Russian (2–4 take a different form from 5–20).

- **Users:** everyone, in all 11 languages.
- **Usage:** after the fix:
  - Buttons that used `.authButton` show their label in sentence case ("Save", "Change password", "Log in", "Create a team"), at the same weight as `app-button` (600).
  - The login button and the register page's corner link say "Log in"; the account menu says "Log out". Other languages keep their (already verb) wording.
  - Every count reads grammatically in every language and for every number: "1 member" / "2 members", "1 attachment", "1 reply" / "3 replies", "1 day left", "1 item inside", "Move 1 ticket to the trash?", "Remove 'Bug' from 1 ticket?", "Delete 'High'? 1 ticket will have no priority". Latvian, Lithuanian and Russian use their own plural forms (for example Latvian 1 / 21 singular, 0 / 10–20 zero form; Russian 1 / 21, 2–4, 5–20).
- **Rules:**
  - A translated string that contains a number of things comes in the plural categories the language needs (Unicode CLDR, as reported by the browser's `Intl.PluralRules`) and is picked by the count, never by `count === 1` checks.
  - Text with no number, the "+N" chips (`TAG_MORE`, `ACTIVITY_EVENT_COUNT`) and messages with a name instead of a count are unchanged.
- **Out of scope:**
  - Small uppercase section and field labels (`.capsLabel`, `.favoritesList__title`, `.ticketDetail__fieldTitle`, `.projectDetail__sidebarLabel`, `.ticketAssignees__title`, `.ticketFilter__heading`, `.myWork__board`). They are labels, not buttons or headings with an eyebrow; the critique only flagged buttons. Their heading levels belong to `item-title-hierarchy.spec.md`.
  - Confirm dialog wording and button labels for trash moves and permanent deletes: `trash-undo-without-confirm.spec.md`.
  - Error and status line styling: `announced-status-messages.spec.md`.
  - Storage wording on Manage team (`ATTACHMENTS` heading, `STORAGE_USAGE`): `manage-team-structure.spec.md`.
  - A full product glossary or tone rewrite: not part of the critique.

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. `Intl.PluralRules` (built into every supported browser) chooses the category; `@ngx-translate/core`'s nested keys hold the forms (the translation files already nest `ERRORS.*`).

## 2.2 Structure

### Buttons (`frontend/src/styles.css`)

`.authButton`: delete `letter-spacing: 0.06em;` and `text-transform: uppercase;`, change `font-weight: 700` to `600` (matches `.button` in `components/button/button.component.css`). Nothing else in the rule changes.

### Verb labels (translation files)

In `frontend/public/assets/translations/en.json`: `"LOGIN": "Log in"`, `"LOGOUT": "Log out"`. The other ten languages already use verbs (`Pieslēgties`, `Anmelden`, `Logga in`, `Se connecter`, …) and stay. Keys and `PHRASES` names don't change.

### Plural helper

- `frontend/src/app/utils/plural.ts` (new):
  - `pluralCategory(count: number, language: string): Intl.LDMLPluralRule`: `new Intl.PluralRules(language).select(count)`, with one cached `Intl.PluralRules` per language in a module-level `Map`.
  - `pluralKey(key: string, count: number, language: string): string`: returns `` `${key}.${pluralCategory(count, language)}` ``.
- `frontend/src/app/pipes/plural.pipe.ts` (new): `@Pipe({name: 'plural', pure: false})` `PluralPipe` with `transform(key: string, count: number): string`, injecting `TranslateService` and returning `pluralKey(key, count, language)` where `language` is `this.translateService.getCurrentLang() ?? this.translateService.getFallbackLang() ?? defaultLanguage` (the same expression `comment-item`, `activity-row` and `attachment-row` use). Impure because the language can change while the count stays the same; it only builds a string, and `TranslatePipe` after it does the loading and re-rendering.
- `frontend/tsconfig.json`: add the alias `"@pipes/*": ["./src/app/pipes/*"]` next to the others. Components import `PluralPipe` from `@pipes/plural.pipe`.
- Template use: `{{ PHRASES.MEMBER_COUNT | plural: project.memberCount | translate: {count: project.memberCount} }}`. TS use: `this.translateService.instant(pluralKey(PHRASES.CONFIRM_DELETE_TAG, count, language), {name: tag.name, count})`.

### Plural strings

Each key below turns from a string into an object of plural forms in every translation file, keyed by the CLDR categories `new Intl.PluralRules('<code>').resolvedOptions().pluralCategories` lists for that language. For the supported languages that is: `en`, `de`, `sv`, `da`, `fi`, `et`: `one`, `other`; `fr`, `es`: `one`, `many`, `other`; `lv`: `zero`, `one`, `other`; `lt`: `one`, `few`, `many`, `other`; `ru`: `one`, `few`, `many`, `other`. Verify the list in the test browser (the test in block B does). Every form keeps `{{count}}` and any other parameter the string has (`{{name}}`). Write grammatical forms; for French and Spanish `many` (round millions) use the `other` wording with "de" ("{{count}} de membres", "{{count}} de miembros"); for Lithuanian `many` and Russian `other` (fractions only) use the genitive-singular form ("narių"-style wording is fine); the "Label: {{count}}" style some translators chose ("Narių: {{count}}", "Участников: {{count}}") is grammatical for every number and may stay in every category.

| Key | English `one` | English `other` | Used in |
|---|---|---|---|
| `MEMBER_COUNT` | `{{count}} member` | `{{count}} members` | `pages/dashboard/projects/projects.component.html` |
| `ATTACHMENT_COUNT` | `{{count}} attachment` | `{{count}} attachments` | `components/kanban-ticket/kanban-ticket.component.html` (tooltip and `aria-label`) |
| `COMMENT_REPLIES` | `{{count}} reply` | `{{count}} replies` | `components/diagram-comment-layer/diagram-comment-layer.component.html` |
| `SELECTED_COUNT` | `{{count}} selected` | `{{count}} selected` | `components/ticket-selection-bar/ticket-selection-bar.component.html` |
| `CONFIRM_DELETE_TICKETS` | `Move {{count}} ticket to the trash?` | `Move {{count}} tickets to the trash?` | `pages/dashboard/list-tab/list-tab.component.html` |
| `CONFIRM_DELETE_PRIORITY` | `Delete '{{name}}'? {{count}} ticket will have no priority` | `Delete '{{name}}'? {{count}} tickets will have no priority` | `components/priority-list/priority-list.component.ts` |
| `CONFIRM_DELETE_TAG` | `Remove '{{name}}' from {{count}} ticket?` | `Remove '{{name}}' from {{count}} tickets?` | `components/tag-list/tag-list.component.ts` |
| `TRASH_DAYS_LEFT` | `{{count}} day left` | `{{count}} days left` | `pages/dashboard/trash/trash.component.html` |
| `TRASH_ITEMS_INSIDE` | `{{count}} item inside` | `{{count}} items inside` | `pages/dashboard/trash/trash.component.html` |

`SELECTED_COUNT` has the same English forms but agrees with the number in Latvian, Lithuanian, Russian and French ("sélectionné(s)" today), so it gets forms too.

Removed (replaced by the forms above): `CONFIRM_DELETE_PRIORITY_ONE`, `CONFIRM_DELETE_TAG_ONE`, `TRASH_DAYS_LEFT_ONE`, `TRASH_ITEMS_INSIDE_ONE` from `config/phrases.ts` and every translation file. `CONFIRM_DELETE_UNUSED_PRIORITY` / `CONFIRM_DELETE_UNUSED_TAG` (count 0, a different message) stay.

### Call sites

- `projects.component.html`, `kanban-ticket.component.html` (both bindings), `diagram-comment-layer.component.html`, `ticket-selection-bar.component.html`, `list-tab.component.html`: insert `| plural: <count expression>` before `| translate`, and add `PluralPipe` to each component's `imports`.
- `trash.component.html`: replace both `(x === 1 ? PHRASES.X_ONE : PHRASES.X)` ternaries with `PHRASES.X | plural: x | translate: {count: x}`; import `PluralPipe`.
- `priority-list.component.ts` / `tag-list.component.ts`: drop the `count === 1` branch and call `instant(pluralKey(PHRASES.CONFIRM_DELETE_…, count, language), {name, count})` with `language` built like the pipe's. Keep the `!count` branch (unused message).
- After these, grep `frontend/src/app` for `=== 1 ?` next to a `PHRASES.` reference and for `translate: {count` without `plural` to catch any call site this list missed; leave `TAG_MORE` and `ACTIVITY_EVENT_COUNT` alone.

### Tests

- `frontend/src/app/utils/plural.spec.ts` (new): `pluralKey('MEMBER_COUNT', 1, 'en')` is `'MEMBER_COUNT.one'`, `2` → `.other`; Latvian `0` → `.zero`, `21` → `.one`, `11` → `.zero`; Russian `3` → `.few`, `5` → `.many`, `21` → `.one`; Lithuanian `2` → `.few`, `10` → `.other`.
- `frontend/src/app/pipes/plural.pipe.spec.ts` (new): with `TestBed`, `provideTranslateService()` and `translateService.use('lv')` (or a stub with `getCurrentLang`), the pipe returns `KEY.zero` for 10; after switching to `en` it returns `KEY.other` for the same count (proves it follows the language); with no current language it falls back to the fallback and then `defaultLanguage`.
- `frontend/src/app/config/translationConfig.spec.ts` (new): fetch every `/assets/translations/<code>.json` for `supportedTranslations` (the Karma build serves `public/` as assets). The plural keys are the top-level `en.json` entries whose value is an object with an `other` member. For every language: each plural key exists as an object, has a string for every category in `new Intl.PluralRules(code).resolvedOptions().pluralCategories`, every form contains `{{count}}`, and none of the removed `_ONE` keys remains. This guards every future plural string too.
- `components/priority-list/priority-list.component.spec.ts`: the two expectations built from `CONFIRM_DELETE_PRIORITY` and `CONFIRM_DELETE_PRIORITY_ONE` now expect `CONFIRM_DELETE_PRIORITY.other` with `{"name":"High","count":2}` and `CONFIRM_DELETE_PRIORITY.one` with `{"name":"High","count":1}` (the test translate setup returns the key plus params). If `tag-list` has the same expectations in another spec, update them the same way.
- Any existing spec that reads the rendered text of a changed binding (projects, kanban-ticket, trash, ticket-selection-bar, diagram-comment-layer) now sees `KEY.one` / `KEY.other`; update those expectations.

### Docs

`CLAUDE.md`:
- Frontend > Structure tree: add `pipes/        Angular pipes (plural.pipe.ts)` and in Path aliases add `@pipes/*`.
- Frontend > i18n: add that strings with a count are objects of CLDR plural forms (`one`, `other`, plus `zero` / `few` / `many` where the language has them) chosen with `| plural: count | translate: {count}` in templates or `pluralKey(...)` from `@utils/plural` in TS, never with `count === 1`, and that `config/translationConfig.spec.ts` checks every language has every form.

### Parallel work

- **trash-undo-without-confirm** removes or rewrites confirm dialogs for reversible moves to the trash. If it has removed the bulk "Move N tickets to the trash?" dialog from `list-tab.component.html` (and `CONFIRM_DELETE_TICKETS` with it), skip that key and call site. If it rewords `CONFIRM_DELETE_PRIORITY`, `CONFIRM_DELETE_TAG` or the Trash page strings, keep its wording and give each its plural forms.
- **list-tab-polish** moves the selection bar in `list-tab.component.html` and edits `list-row`; this spec only changes the `[message]` binding of the bulk delete confirm. **kanban-card-readability** restructures `kanban-ticket.component.*`; this spec only changes the two `ATTACHMENT_COUNT` bindings, which move with the element they sit on.
- **theme-contrast** and **announced-status-messages** also edit `styles.css` (`.authField`, `.textInput`, placeholders, `.authStatus`); this spec only edits `.authButton`. **announced-status-messages** turns login and register into real forms; the button keeps `class="authButton"` and its `PHRASES.LOGIN` / `PHRASES.REGISTER` label.
- **responsive-dashboard-shell** restructures `dashboard-header.component.html`; this spec doesn't touch that template, only the `LOGOUT` translation.
- Translation files are edited by many specs: change the plural keys in place (where the string is today) and add nothing at the end of the files. `CLAUDE.md` is edited by several specs; change only the lines named above.

## 2.3 Decisions

1. **Sentence case on every button, by removing the transform** (2026-11-04). Reason: Nielsen #4 consistency (the same "Save" looked different in two places; Impeccable operate.md "If the 'save' button looks different in two places, one is wrong"); Impeccable clarify.md lists "inconsistent terminology and capitalization" as a defect; uppercase also defeats translators' own casing and reads slower. Weight 600 matches `app-button`. Rejected: uppercasing every button instead (the whole app would shout; Operate restraint).
2. **"Log in" / "Log out" in English only** (2026-11-04). Reason: Impeccable clarify.md "Use a specific verb … Keep the same noun and verb for the same concept throughout the product"; the app's messages already say "log in". Other languages already use verbs; their wording isn't touched.
3. **Small uppercase labels stay** (2026-11-04). Reason: they are section and field labels in dense sidebars and panels, a recognised Operate pattern, not buttons or eyebrows above a heading (Impeccable craft-floor's ban covers kickers above headings); the critique only flagged buttons. Rejected: removing them in this spec (scope; heading semantics belong to item-title-hierarchy).
4. **Plurals with `Intl.PluralRules` and nested category keys, no new library** (2026-11-04). Reason: Impeccable clarify.md "Write complete translatable messages … Keep variables and numbers structured so translators can reorder them" and Verify "pluralization"; CLDR categories are what Latvian, Lithuanian and Russian need, the browser provides them, and ngx-translate already supports nested keys. Rejected: `ngx-translate-messageformat-compiler` with ICU syntax (new dependency and compiler for nine strings; ICU strings are harder to hand-edit in eleven JSON files); keeping `count === 1` switches (wrong in three of the supported languages).
5. **A `plural` pipe that returns a key, chained before `translate`** (2026-11-04). Reason: keeps `TranslatePipe` in charge of loading, parameters and language changes; the pipe is a few lines and testable on its own. Impure so a language switch with an unchanged count still re-picks the category (Polish of the existing pattern: `TranslatePipe` is impure for the same reason). Rejected: component methods per screen (repeats the language lookup in every component).
6. **`SELECTED_COUNT` gets forms though English doesn't change** (2026-11-04). Reason: the participle agrees with the number in Latvian, Lithuanian, Russian and French; the test treats every count string the same.
7. **The translation test derives plural keys from `en.json`** (2026-11-04). Reason: no second list to keep in sync; any future count string written as forms is checked in all languages automatically.

### Decisions to double-check

- **New `pipes/` folder and `@pipes/*` path alias** for `PluralPipe`. The app has no pipes yet; this adds a folder to the documented structure. The alternative is putting the pipe in `utils/` (which today holds only pure functions).

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Buttons and verbs
- [x] A1. In `frontend/src/styles.css` remove `letter-spacing` and `text-transform` from `.authButton` and set `font-weight: 600`.
- [x] A2. In `en.json` set `LOGIN` to "Log in" and `LOGOUT` to "Log out". Check that no spec asserts the old English text (grep the spec files for `'Login'` / `'Logout'`).

### B. Plural helper
- [ ] B1. Create `frontend/src/app/utils/plural.ts` (`pluralCategory`, `pluralKey`) and `utils/plural.spec.ts` with the cases from Part 2.2.
- [ ] B2. Add the `@pipes/*` alias to `frontend/tsconfig.json`, create `frontend/src/app/pipes/plural.pipe.ts` and `pipes/plural.pipe.spec.ts` as described.
- [ ] B3. Create `frontend/src/app/config/translationConfig.spec.ts` with the coverage test from Part 2.2. Run `npm test`: it passes trivially while no key is plural yet; temporarily turn `MEMBER_COUNT` in `en.json` into `{one, other}` without changing `lv.json` and confirm the test fails, then revert.

### C. Plural strings and call sites
- [ ] C1. Convert the nine keys in Part 2.2 to plural objects in all 11 translation files, in place, with grammatical forms for every category of each language; delete the four `_ONE` keys from the translation files and `config/phrases.ts`.
- [ ] C2. Update the template call sites (projects, kanban-ticket, diagram-comment-layer, ticket-selection-bar, list-tab, trash) to use `| plural:` and import `PluralPipe`.
- [ ] C3. Update `priority-list.component.ts` and `tag-list.component.ts` to `pluralKey` and drop their `count === 1` branches; update `priority-list.component.spec.ts` (and any tag-list spec) expectations.
- [ ] C4. Grep for missed count call sites as described in Part 2.2; fix existing specs that read changed text. Run `npm test`; the translation coverage test passes for all 11 languages.

### D. Docs
- [ ] D1. Update `CLAUDE.md` (Structure tree, Path aliases, i18n) as described in Part 2.2.

### Z. Wrap-up
- [ ] Z1. Full test runs (`npm test` in `frontend/`, `bin/rails test` in `backend/`) and `npm run build`.
- [ ] Z2. Manual check in the running app: login page button reads "Log in" (sentence case) and the register page link "Log in"; Settings, Profile (Change password) and Manage team buttons are sentence case; the account menu says "Log out". On a project with one member the Projects list shows "1 member"; a Kanban card with one attachment has the tooltip "1 attachment"; selecting one ticket in the List tab and choosing Delete asks "Move 1 ticket to the trash?" (if that dialog still exists); a diagram pin with one reply says "1 reply"; the Trash page shows "1 day left" / "1 item inside" where it applies. Switch the language to Latvian and Russian and check the same places read naturally for 1, 2, 5, 11 and 21 where you can produce those counts.
