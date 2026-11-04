# Manage team structure — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

The Manage team page (team admins and the owner) is one long column whose order does not follow what people come to do. It opens with the raw 32-character team code in a large monospace box, without saying what the code is for. It then shows a section titled "Attachments" that is really the team's storage figure, then "Rename team", Members, Features, and finally a lone red Delete team button with no heading. Member rows are bordered boxes inside another bordered box.

The page is reorganised into five clear sections, in this order, each with a heading:

1. **General**: the team name field and Save (today's "Rename team" section).
2. **Members**: first a short invite line, "Share this code with others so they can join your team:", with the team code in a compact, quieter style and its copy button; then the member list.
3. **Features** (owner only): the feature toggles, unchanged in behaviour.
4. **Storage**: "13 MB of 500 MB used".
5. **Danger zone** (owner only): a bordered section in the error colour with the **Delete team** button, the same pattern the project settings dialog already uses.

- **Users:** team admins and the owner (the route keeps `teamRoleGuard`).
- **Usage:**
  1. The page title stays "Manage team". The general alert line stays directly under it.
  2. **General:** label "Team name", the input and **Save**; the "Team name updated" status shows under it as today.
  3. **Members:** the invite line and compact code display (copy button with a styled tooltip "Copy code" / "Code copied"), then the member list as one bordered list with divider lines between rows (avatar, nickname, role, actions menu), no box per row. Member actions, confirms and toasts are unchanged. While members load, the list is absent as today.
  4. **Features:** shown only to the owner, same controls and saving behaviour as today.
  5. **Storage:** shown once the usage has loaded (it is admin/owner only on the API); hidden if the request fails, as today.
  6. **Danger zone:** shown only to the owner; **Delete team** opens the existing confirm dialog.
  7. Sections are separated by spacing and a thin divider, not by cards inside the page card.
- **Rules:** no permission, data or API change. Admins see General, Members and Storage; the owner also sees Features and Danger zone.
- **Out of scope:**
  - Moving the page into the dashboard shell and removing "Back to dashboard": `account-pages-in-shell`.
  - Replacing the feature checkboxes with switches: `settings-switch-toggles`.
  - The wording of the delete team confirm (naming the team): `trash-undo-without-confirm`.
  - Heading levels across screens (the page title is an `h2` today): `item-title-hierarchy`.
  - Alert line styling and roles: `announced-status-messages`.
  - Button text casing ("SAVE") and member count plurals: `ui-copy-consistency`.
  - A storage meter bar, member search or pagination.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing stack only: Angular templates, ngx-translate, the shared `ButtonComponent` (`variant="danger"`), `TooltipDirective`, theme tokens. No new dependencies.

## 2.2 Structure

**`frontend/src/app/pages/manage-team/manage-team.component.html`** (changed): sections reordered as in Part 1, each a `<section class="manageTeam__section">` with its `h3.manageTeam__sectionTitle`:
- General: heading `PHRASES.GENERAL`, then the existing team name field, Save button and status line.
- Members: heading `PHRASES.TEAM_MEMBERS`; then `<p class="manageTeam__invite">{{ PHRASES.TEAM_CODE_SHARE_NOTICE | translate }}</p>` and `<app-team-code-display [code]="teamCode" [compact]="true">`; then the member list.
- Features: unchanged block, moved.
- Storage: heading `PHRASES.STORAGE`, then `<p class="manageTeam__storage">{{ PHRASES.STORAGE_USAGE | translate: storageParams }}</p>` (class kept so the existing spec still finds it).
- Danger zone: `<section class="manageTeam__section manageTeam__danger" *ngIf="isOwner">` with `h3.manageTeam__dangerTitle` `PHRASES.DANGER_ZONE` and `<app-button variant="danger" icon="trash" (pressed)="handleDeleteTeam()">{{ PHRASES.DELETE_TEAM | translate }}</app-button>`, replacing the hand-styled `manageTeam__deleteButton`.
- The "Team code" section and its `PHRASES.TEAM_CODE` heading are removed from this page (the key stays; Join team uses it).

**`manage-team.component.ts`** (changed): add `ButtonComponent` to `imports`. No logic change.

**`manage-team.component.css`** (changed):
- `.manageTeam__section + .manageTeam__section` gets `border-top: 1px solid var(--color-input-border)` and `padding-top: var(--space-5)`; heading margin tightened to `var(--space-3)` so a heading sits closer to its content than to the section above.
- `.manageTeam__invite`: `margin: 0 0 var(--space-2)`, `color: var(--color-text-muted)`, `font-size: var(--font-sm)`.
- `.manageTeam__memberList` keeps its border and radius but drops its padding and gap; `.manageTeam__memberRow` drops its own border, background and radius, uses `padding: var(--space-3) var(--space-4)`, and `.manageTeam__memberRow + .manageTeam__memberRow` gets a top divider.
- `.manageTeam__danger` and `.manageTeam__dangerTitle` follow `project-settings-dialog.component.css` (`.projectSettingsDialog__danger*`): 1px border `color-mix(in srgb, var(--color-error) 35%, transparent)`, `var(--radius-md)`, `var(--space-4)` padding, title in `var(--color-error)`. The danger section has no divider above it (its own border separates it).
- `.manageTeam__deleteButton` rules are removed. The `.manageTeam` card wrapper rules are left untouched (see Parallel work). The file stays under the 4kB budget.

**`TeamCodeDisplayComponent`** (`components/team-code-display/`, changed):
- New `@Input() compact = false`, binding `[class.teamCodeDisplay--compact]="compact"` on the root. Compact: `display: inline-flex` with `max-width: 100%`, `padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3)`, `font-size: var(--font-sm)`, `color: var(--color-text-muted)`. Create team keeps the default large look.
- The copy button's native `[title]` is replaced by `[appTooltip]` with the same text (CLAUDE.md: icon-only controls use `appTooltip` plus `aria-label`, never `title`); import `TooltipDirective`.
- New `team-code-display.component.spec.ts`: the compact class is applied only with `compact`, the button has an `aria-label` and no `title` attribute.

**Translations** (`config/phrases.ts` and all 11 files in `frontend/public/assets/translations/`, edited next to the related keys, not at the end):
- Add `GENERAL` ("General") next to `MANAGE_TEAM`, and `STORAGE` ("Storage") next to `STORAGE_USAGE`.
- Change `STORAGE_USAGE` to "{{used}} of {{quota}} used" (drop the "Storage:" prefix, now in the heading) in every language.
- `RENAME_TEAM` becomes unused on this page; remove it from `phrases.ts` and every translation file if grep finds no other use. `ATTACHMENTS` stays (attachment lists use it).

**Parallel work** (this page is touched by several specs; keep changes inside the section markup and section CSS so merges stay local):
- `account-pages-in-shell` moves the page into the dashboard shell: it owns the back button, the `.manageTeam` wrapper (width, card background, shadow, padding) and the page title element. This spec does not change those lines.
- `settings-switch-toggles` replaces the `app-checkbox` feature toggles with the new switch component. This spec only moves the Features block; when merging, keep that spec's switch markup in the new position.
- `trash-undo-without-confirm` changes the delete team confirm message; this spec keeps the existing `app-confirm-dialog` untouched.
- `item-title-hierarchy` may change the title and section heading levels; the section headings here keep their current `h3` elements and class names.
- `ui-copy-consistency` changes casing and plurals; nothing here depends on them.

## 2.3 Decisions
1. **Section order General, Members, Features, Storage, Danger zone (2026-11-04):** Reason: the critique's recommended grouping; settings pages conventionally start with the item's identity and end with destructive actions (Nielsen #4 consistency with Profile and the project settings dialog, Impeccable operate.md "earned familiarity"); Impeccable layout.md "Let hierarchy follow product priority" puts the members list, the page's most-used part, second, right under the one-field General section. Rejected: Members first (General would land between members and features, which reads oddly), tabs or an in-page section nav (five short sections fit one screen; tabs would hide the danger zone and features behind clicks for no gain).
2. **Team code lives in Members as an invite line (2026-11-04):** Reason: the code's only purpose is letting people join, so it belongs where members are managed and needs the sentence that says so (Nielsen #6 recognition rather than recall); the existing `TEAM_CODE_SHARE_NOTICE` text already says it. Impeccable distill.md "Clear hierarchy": secondary information gets a quieter style, hence the compact, muted display. Rejected: hiding it behind a "Show code" button (extra click for a frequent task), keeping it as the page's first section (the critique's finding).
3. **"Attachments" heading renamed to "Storage" (2026-11-04):** the section shows storage used against the quota, not attachments. Reason: Impeccable clarify / craft-floor "Copy: the product's own language"; the usage text drops its "Storage:" prefix so the word is not said twice (distill.md "Remove redundant copy"). A new key is used because `ATTACHMENTS` titles the attachment lists elsewhere.
4. **Danger zone reuses the project settings pattern (2026-11-04):** a 1px error-tinted bordered section with a "Danger zone" heading and `app-button variant="danger"`. Reason: Nielsen #4 consistency (same pattern as `project-settings-dialog`), CLAUDE.md "Reuse the shared components"; craft-floor allows a 1px border (it bans thick coloured side borders). Rejected: keeping the hand-styled `manageTeam__deleteButton`.
5. **Flatten the member list (2026-11-04):** one bordered list with dividers instead of a box per row inside a box. Reason: Impeccable distill.md "never nest cards inside cards"; layout.md "Group by meaning. Use proximity before adding containers".
6. **Sections separated by dividers and spacing, not cards (2026-11-04):** Reason: the page itself is already a card; Impeccable layout.md rhythm of "tight groups, generous separation".
7. **Team code copy button gets `appTooltip` (2026-11-04):** the component is changed here anyway and the native `title` breaks a CLAUDE.md convention. Kept minimal: same text, also improving Create team.
8. **No storage meter (2026-11-04):** the text figure is enough for a 500 MB quota. Reason: Impeccable craft-floor.md refuses progress rings and decorative meters standing in for content; can be added later if teams approach the quota.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Team code display
- [ ] A1. In `frontend/src/app/components/team-code-display/`, add the `compact` input and `.teamCodeDisplay--compact` styles, and replace the copy button's `[title]` with `[appTooltip]` (import `TooltipDirective` from `@components/tooltip/tooltip.directive`).
- [ ] A2. Add `team-code-display.component.spec.ts`: compact class only with `compact = true`; the copy button has an `aria-label` and no `title`; clicking it copies the code (stub `navigator.clipboard.writeText` with a spy) and switches the label to "Code copied".

### B. Page structure
- [ ] B1. Translations: add `GENERAL` and `STORAGE`, change `STORAGE_USAGE` to drop its prefix, and remove `RENAME_TEAM` if unused, in `frontend/src/app/config/phrases.ts` and all 11 translation files, next to the related keys.
- [ ] B2. Rewrite the sections of `frontend/src/app/pages/manage-team/manage-team.component.html` in the order and markup of Part 2.2 (General, Members with invite line and compact code, Features, Storage, Danger zone with `app-button variant="danger"`), leaving the back button, the `.manageTeam` wrapper, the title and the two confirm dialogs as they are. Add `ButtonComponent` to the component's `imports`.
- [ ] B3. Update `manage-team.component.css`: section dividers and heading spacing, `.manageTeam__invite`, the flattened member list, `.manageTeam__danger` / `.manageTeam__dangerTitle`; remove `.manageTeam__deleteButton*`. Check the size stays under 4kB.
- [ ] B4. Extend `manage-team.component.spec.ts` (TestBed `render` helper): section headings appear in the order General, Members, Features, Storage, Danger zone for the owner; an admin sees General, Members and Storage but no Features or Danger zone; the team code display sits inside the Members section with `compact`; the storage line reads "13 MB of 500 MB used" in the translated text and its heading is Storage; the Danger zone's button opens the delete confirm (`showDeleteConfirm`). Keep the existing tests passing.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test`, `npm run build` in `frontend/`; `bin/rails test` in `backend/` to confirm the untouched baseline).
- [ ] Z2. Manual check in the running app: as the owner open Manage team and read the five sections top to bottom; copy the code and see the tooltip and "Code copied"; rename the team; change a member's role; toggle a feature; open Delete team and cancel; log in as an admin and confirm Features and Danger zone are absent; check Create team still shows the large code display; check light and dark mode and a 375px wide window.
