# Board overview focus — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

A board's **Overview** tab mixes two jobs. It shows how the board is doing (ticket counts, tickets per column, tickets per assignee, recent activity), and it is also where the board's **Priorities** and **Tags** are set up. Its charts repeat themselves: "Tickets per column" draws the same numbers twice, as a pie and as bars; "Tickets per assignee" is a pie that is often a single full circle (everything Unassigned) and whose slices do not even add up to a whole, because a ticket with two assignees is counted for both. Three big number tiles (Total, On the board, In the backlog) say again what the column chart says.

This feature gives each job its own place:
- **Overview** becomes analytics only: one chart of tickets by status, one chart of tickets per assignee, and recent activity.
- A new **Settings** tab, after List, holds the board's Priorities and Tags.

- **Users:** any member who can see the board (boards feature on). Everyone can already manage priorities and tags, and that stays.
- **Usage — Overview tab (`/dashboard/boards/:id/overview`):**
  1. **Tickets by status** (a section with heading "Tickets by status" and a muted line "Total tickets: N"): one horizontal bar row per status, **Backlog first, then each column in board order** (the same order as the List tab). Each row shows the status name, a bar whose length is relative to the largest row, and the count. Statuses with 0 tickets show an empty track and "0". When the board has no tickets at all, the section shows "No tickets yet." instead of bars.
  2. **Tickets per assignee**: one horizontal bar row per person with at least one ticket, largest first, then **Unassigned** last (when it has at least one ticket). Same row look as the status chart. No tickets at all: "No tickets yet."
  3. On wide screens the two charts sit side by side (each at least ~320px wide); on narrow screens they stack.
  4. **Recent activity**: unchanged (created / updated in the last 7 days, the most recently updated tickets, each opening its ticket).
  5. Loading and errors behave as today (nothing until loaded; the error in the alert line).
  6. The three number tiles, both pie charts and the Priorities and Tags sections are gone from this tab.
- **Usage — Settings tab (`/dashboard/boards/:id/settings`):**
  1. The board's tab bar reads **Overview | Kanban | List | Settings**.
  2. The tab shows two sections, **Priorities** (today's `PriorityListComponent`: add, rename, recolour, reorder, delete) and **Tags** (today's `TagListComponent`), with the same headings and behaviour they have on the Overview tab today, including live updates from other people.
- **Rules:** no permission, data or API change. The overview endpoint keeps returning `board_tickets` and the other fields; the frontend simply stops showing some of them. Board templates, columns (managed on the Kanban tab) and ticket editing are untouched.
- **Out of scope:**
  - Moving column management or board rename / project / delete into Settings: they live in the Kanban tab and the board header, where they are used in place.
  - Hover tooltips, filters or time ranges on the charts: every bar already prints its exact value next to it.
  - Removing the `--color-chart-*` theme tokens, which become unused: `theme-contrast` owns the theme files (see Decisions to double-check).

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing stack only (Angular, ngx-translate, router child routes, theme tokens). No new dependencies, no chart library.

## 2.2 Structure

**New component `BarListComponent`** (`frontend/src/app/components/bar-list/`, selector `app-bar-list`, `.ts`, `.html`, `.css`, `.spec.ts`; create with `npm run newcomponent bar-list` and add the spec by hand):
- Exports `interface BarListRow { label: string; value: number; }` from the component file (as `PieSlice` was).
- `@Input() rows: BarListRow[] = []`, `@Input() emptyText = ''`.
- Getters `hasData` (some row value > 0) and `max` (`Math.max(1, ...values)`), and `width(row)` returning `row.value / max * 100`.
- Template: when `hasData`, a `<ul class="barList">` with one `<li class="barList__row">` per row: `<span class="barList__label">`, `<span class="barList__track" aria-hidden="true"><span class="barList__fill" [style.width.%]="width(row)"></span></span>`, `<span class="barList__value">`. Otherwise `<p class="barList__empty">{{ emptyText }}</p>`.
- CSS moves from the overview's `.boardOverview__bar*` rules: grid `minmax(0, 10rem) 1fr auto`, label `overflow-wrap: anywhere`, track `color-mix(in srgb, var(--color-tint) 8%, transparent)`, fill `var(--color-primary-light)` with rounded ends, value with `font-variant-numeric: tabular-nums`. One hue for every bar.

**`BoardOverviewTabComponent`** (`pages/dashboard/board-overview-tab/`, changed):
- `columnSlices` / `assigneeSlices` / `maxColumnCount` are replaced by `statusRows: BarListRow[]` (Backlog with `overview.backlogTickets`, then `overview.columns` in order) and `assigneeRows: BarListRow[]` (rows with `ticketCount > 0`; people in the API's order, which is by count descending; the `user === null` row moved to the end, labelled with `PHRASES.UNASSIGNED`).
- Imports `BarListComponent` instead of `PieChartComponent`, `PriorityListComponent`, `TagListComponent`; `chartColor` is no longer imported.
- Template: alert line; then `.boardOverview__charts` (grid `repeat(auto-fit, minmax(320px, 1fr))`) with the two chart sections; then the Recent activity section. The tiles markup and the Priorities / Tags sections are removed. The status section shows `{{ PHRASES.TOTAL_TICKETS | translate }}: {{ overview.totalTickets }}` as a muted line under its heading.
- CSS: tiles and bar rules removed; `.boardOverview__charts` and `.boardOverview__total` added.

**New component `BoardSettingsTabComponent`** (`pages/dashboard/board-settings-tab/`, selector `app-board-settings-tab`): a template with two sections (`h2` "Priorities" + `<app-priority-list>`, `h2` "Tags" + `<app-tag-list>`), styled like the overview sections (same card look and heading size, copied into its own small stylesheet). It needs no TS logic beyond `PHRASES`. Its spec checks that both lists render.

**Routing:** in `frontend/src/app/app/dashboard.routes.ts`, the board's children get `{path: AppRoutes.SETTINGS, component: BoardSettingsTabComponent}` after the List route. `AppRoutes.SETTINGS` (`'settings'`) already exists; reusing the enum value is fine because the board child path is relative.

**Board tab bar:** `pages/dashboard/board-page/board-page.component.html` gets a fourth `<a class="boardPage__tab" [routerLink]="AppRoutes.SETTINGS" routerLinkActive="boardPage__tab--active">{{ PHRASES.TAB_SETTINGS | translate }}</a>`.

**Removed:** `components/pie-chart/` (component, template, CSS, spec) and `config/chartColors.ts` with `config/chartColors.spec.ts`, which become unused.

**Translations** (`config/phrases.ts` and all 11 files in `frontend/public/assets/translations/`, edited in place, not appended at the end):
- Add `TAB_SETTINGS` ("Settings") next to `TAB_LIST`, and `TICKETS_BY_STATUS` ("Tickets by status") next to `TICKETS_PER_COLUMN`.
- Remove `TICKETS_PER_COLUMN`, `TICKETS_ON_BOARD` and `TICKETS_IN_BACKLOG` (unused afterwards; check with grep first).
- Keep `TOTAL_TICKETS`, `TICKETS_PER_ASSIGNEE`, `PRIORITIES`, `TAGS`, `NO_TICKETS_YET`, `UNASSIGNED`.

**Docs:** `CLAUDE.md` — the board routes line becomes `{overview|kanban|list|settings}`; "managed in the Overview tab's `PriorityListComponent`" / "`TagListComponent`" become the Settings tab (`BoardSettingsTabComponent`); the Themes line "Chart colours are `var(--color-chart-N)` from `chartColor()`, bound through `[style.fill]`" is replaced by a short note that the board Overview draws `app-bar-list` bars in one colour (`--color-primary-light`).

**Parallel work:**
- `list-tab-polish`, `ticket-status-control` and `kanban-card-readability` may edit the same long Boards paragraph in `CLAUDE.md`; only change the words named above so the merge stays line-local.
- `item-title-hierarchy` reviews heading order across screens; the new tab follows the board page's existing order (`h1` board title, `h2` sections).
- `empty-states-guidance` may reword "No tickets yet."; this spec only reuses the key.
- `theme-contrast` owns the `--color-chart-*` tokens and `config/themes.ts`; this spec does not touch them.

## 2.3 Decisions
1. **One chart per question (2026-11-04):** remove the pie that repeated the column bars, and draw tickets per assignee as bars. Reason: Impeccable distill.md "Remove redundancy: if it's said elsewhere, don't repeat it here"; the dataviz rules prefer ranked horizontal bars over a pie for comparing parts, and a single-slice pie is a listed anti-pattern. Assignee counts are not a part-to-whole (a ticket with several assignees counts for each), so a pie misstates them. Rejected: keeping the pies and dropping the bars (angles compare worse than lengths), a donut (same problem).
2. **Status order and Backlog (2026-11-04):** Backlog first, then columns in board order, not sorted by count. Reason: the statuses are a workflow with a natural order, the List tab uses the same order (Nielsen #4 consistency), and the Backlog count was previously only in a tile. Rejected: ranking statuses by size (breaks the workflow reading).
3. **Assignee order (2026-11-04):** people by count descending, Unassigned last, zero rows hidden. Reason: dataviz "ranked bars, largest first"; a "none" bucket conventionally sits at the end so it does not read as a person. Rejected: Unassigned ranked by its count (it often tops the chart and hides the people).
4. **Number tiles removed (2026-11-04):** Total stays as one muted line on the status chart; On the board and In the backlog are readable from the bars. Reason: Impeccable craft-floor.md lists the big-number tile row as a category default to refuse unless earned, and distill.md removes repeated information. Rejected: keeping the tiles beside the charts.
5. **One bar colour (2026-11-04):** every bar uses `--color-primary-light`, with the value printed as text. Reason: dataviz "a single series needs no legend; identity is never colour-alone"; the bars are one measure, so categorical colours would add meaning that is not there. This leaves `chartColor()` unused, so it is deleted (Impeccable distill.md "Remove unused code").
6. **Configuration moves to a new Settings tab (2026-11-04):** Priorities and Tags leave Overview for a fourth tab, Settings, at `/dashboard/boards/:id/settings`. Reason: Impeccable distill.md "Progressive disclosure" and layout.md "Group by meaning": setup is rare, analytics are read often; a Settings tab at the end of a tab bar is a known pattern (GitHub, Jira), Impeccable operate.md "Standard navigation patterns". Rejected: keeping both in Overview under separate headings (still mixes jobs and pushes analytics below setup), a settings dialog from the header (Impeccable operate.md "Modal as first thought"), putting them in the Kanban tab (crowds the board).
7. **Shared bar component (2026-11-04):** a new presentational `BarListComponent` replaces `PieChartComponent`. Reason: two charts with the same look (CLAUDE.md "Reuse the shared components"), and it keeps the overview stylesheet small.
8. **API untouched (2026-11-04):** the overview response is unchanged and the model keeps `boardTickets`. Reason: the change is about presentation; trimming the endpoint would be a separate backend change for no user-visible gain.

### Decisions to double-check
- **New "Settings" tab and route** (`/dashboard/boards/:id/settings`, label "Settings"): a new navigation concept and name. An alternative name would be "Setup".
- **`--color-chart-1…8` tokens left in place though unused:** removing them touches all nine theme files and `THEME_TOKENS`, which `theme-contrast` owns in parallel; a follow-up can delete them.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Bar list component
- [ ] A1. Create `frontend/src/app/components/bar-list/` (`npm run newcomponent bar-list`) with `BarListRow`, the `rows` / `emptyText` inputs, `hasData`, `max`, `width()`, the template and CSS from Part 2.2 (`ChangeDetectionStrategy.Eager`, camelCase BEM, tokens only).
- [ ] A2. Add `bar-list.component.spec.ts`: one row per input row with label and value, widths relative to the largest value (largest 100%), zero rows get a 0% fill, and the empty text shows when every value is 0 or there are no rows.

### B. Overview tab
- [ ] B1. In `frontend/src/app/pages/dashboard/board-overview-tab/board-overview-tab.component.ts`, replace `columnSlices`, `assigneeSlices` and `maxColumnCount` with `statusRows` and `assigneeRows` as in Part 2.2, and swap the imports (`BarListComponent` in; `PieChartComponent`, `PriorityListComponent`, `TagListComponent`, `chartColor` out).
- [ ] B2. Rewrite `board-overview-tab.component.html` and `.css`: no tiles, a `.boardOverview__charts` grid with "Tickets by status" (with the Total line) and "Tickets per assignee", then Recent activity unchanged; no Priorities / Tags sections.
- [ ] B3. Update `board-overview-tab.component.spec.ts`: replace the pie slice tests with tests that `statusRows` starts with Backlog and follows column order, and that `assigneeRows` drops zero rows and puts Unassigned last with the translated label; keep the load, error and recent ticket tests.

### C. Settings tab
- [ ] C1. Create `frontend/src/app/pages/dashboard/board-settings-tab/` with `BoardSettingsTabComponent` (Priorities and Tags sections, own stylesheet) and a spec that renders both `app-priority-list` and `app-tag-list` (with stubbed children or `NO_ERRORS_SCHEMA`, as other tab specs do).
- [ ] C2. Add the `AppRoutes.SETTINGS` child route after List in `frontend/src/app/app/dashboard.routes.ts`, and the Settings link in `pages/dashboard/board-page/board-page.component.html`.
- [ ] C3. Translations: add `TAB_SETTINGS` and `TICKETS_BY_STATUS`, remove `TICKETS_PER_COLUMN`, `TICKETS_ON_BOARD` and `TICKETS_IN_BACKLOG` in `config/phrases.ts` and all 11 translation files (in place, next to the related keys).

### D. Cleanup
- [ ] D1. Delete `frontend/src/app/components/pie-chart/` and `frontend/src/app/config/chartColors.ts` + `chartColors.spec.ts` after confirming with grep that nothing else imports them.
- [ ] D2. Update `CLAUDE.md` as described under Docs in Part 2.2.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test`, `npm run build` in `frontend/`; `bin/rails test` in `backend/` to confirm the untouched baseline). Check the build reports no style budget warning for the changed components.
- [ ] Z2. Manual check in the running app: open a board with tickets in the backlog and columns, some with two assignees and some unassigned; on Overview see one status chart (Backlog first), one assignee chart (Unassigned last) side by side, no pies or tiles; narrow the window and see them stack; open a brand-new board and see "No tickets yet." in both; open Settings, add, rename, reorder and delete a priority and a tag, and see the Kanban and List tabs and the ticket popup pick them up; check light and dark mode.
