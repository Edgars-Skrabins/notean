# Empty states guidance — Spec

**Type:** feature
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

A new team's Home shows three grey one-line empty sections ("No activity yet", "Star a page…", "Nothing is assigned to you.") and no way forward. An empty diagram in view mode is a blank canvas. Lists that come up empty say "No results found." or "No pages yet — create one to get started." without saying why or offering the next step. These empty states are where people learn the app, and right now they teach nothing.

This feature turns the bare empty states into ones that say what will appear, why it's empty, and the next useful action. Home gets a day-one "Get started" block. The empty diagram gets an *Edit diagram* action. Empty lists and searches get a short title and hint plus an action (create, clear search, show all projects).

- **Users:** every team member, mostly on day one in a new team and whenever a list or search comes up empty.
- **Usage, Home "Get started":**
  1. Home shows a "Get started" block above Activity when all of these hold: the user hasn't dismissed it in this team, the Activity inbox (All) has loaded with no notifications and no error, and the user has no favorites. Until Activity has finished loading the block doesn't show, so it never flashes.
  2. The block has a heading, "Get your team started", and a hint: "Create the first page, diagram or board, or invite teammates to join." Below that is a row of buttons, each shown only when allowed:
     - **New page** (pages on): opens the blank page create popup (`/dashboard/pages/new`).
     - **New diagram** (diagrams on): opens the blank diagram create popup (`/dashboard/diagrams/new`).
     - **New board** (boards on): opens the same "New board" dialog as the sidebar (name plus template choice). On Create it opens the new board, like the sidebar does.
     - **Invite teammates** (owner and admins): opens Manage team, where the team code people join with is shown.
  3. If no button would show (every feature off, regular member), the block doesn't show.
  4. A close icon button ("Hide getting started", with tooltip and aria-label) hides the block for good in this team on this device. The block also goes away on its own once the user has any notification or favorite.
- **Usage, Home sections:** the existing empty lines teach what will appear:
  - Activity, All filter: "No activity yet. You'll see it here when someone assigns you, mentions you, or changes or comments on your items." (Unread stays "You're all caught up".)
  - My work: "Nothing is assigned to you. Tickets assigned to you show up here, grouped by board."
  - Favorites on Home is unchanged (it already teaches). The sidebar Favorites line changes from "No favorites yet." to "Star an item to keep it here."
- **Usage, empty diagram in view mode:** an empty diagram shows a centred message, "This diagram is empty", over the canvas, with an **Edit diagram** button that switches to edit mode (as the header's Edit does). The message appears only after the content has loaded, and it doesn't block comment placement elsewhere on the canvas. Edit mode keeps its existing "Add a shape from the toolbar to get started." hint.
- **Usage, Pages and Diagrams lists:**
  - Nothing at all (no project selected): title "No pages yet" / "No diagrams yet", hint "Pages hold your team's docs, notes and specs. Start blank or from a template." / "Diagrams map out flows and processes. Start blank or from a template.", actions **New page** / **New diagram** (blank create) and **Browse templates** (the Templates tab).
  - Nothing in the selected project: title "No pages in '{{project}}' yet" / "No diagrams in '{{project}}' yet", the same hint, actions **New page** / **New diagram** and **Show all projects** (sets the header's project selector to All).
  - Search with no matches: title "Nothing matches '{{query}}'", hint "Search looks at titles only.", action **Clear search** (empties the field and shows the tree again). If a project is selected, the hint becomes "Only '{{project}}' is searched." and **Show all projects** is offered too.
- **Usage, Projects:**
  - No projects, owner or admin: title "No projects yet", the existing hint ("Create one to group pages, diagrams and boards."), action **New project** (the same dialog as the header button).
  - No projects, regular member: title "No projects yet", hint "Projects you're added to show up here." and no action.
  - Search with no matches: "Nothing matches '{{query}}'", hint "Search looks at project names and descriptions.", **Clear search**.
- **Usage, Project detail:** no items: title "No items in this project yet", hint "New pages, diagrams and boards go into the project picked in the header. You can also move an existing item here from its project setting." When the header's project selector isn't already on this project, **Select this project** sets it.
- **Usage, Trash:**
  - Empty: the existing "Trash is empty" plus its 14-day hint, shown through the shared empty-state look.
  - Search or type filter with no matches: title "Nothing in the trash matches these filters", action **Clear filters** (empties the search and resets the type to All types).
- **Usage, Templates (Templates tab, board templates and the template picker):** search with no matches: "Nothing matches '{{query}}'", "Search looks at titles only.", **Clear search**. The first-use text is unchanged.
- **Rules:**
  - Only actions the user may take are shown (feature flags, roles, `canCreate`), never disabled placeholders.
  - Empty states never replace an error. If a load failed, the existing error message shows and the empty state doesn't.
  - The Home dismissal is per user per team on this device (`localStorage`), never synced. Clearing site data brings the block back on a still-empty Home, which is acceptable.
- **Out of scope:**
  - Global search's no-results state (`global-search-polish`).
  - The board Overview chart empty texts (`board-overview-focus`).
  - The comment list's empty state (`compact-comment-composer`).
  - A guided tour, sample data, or seeded content for new teams: Impeccable onboard.md prefers context over ceremony, and seeded data would be a data-model change.
  - The sidebar Boards/Chat empty lines: a Create row sits right under them already.

# Part 2 — Technical details

## 2.1 Tools and libraries
Existing stack: Angular standalone components, ngx-translate, `ProjectFilterService`, `BoardService`, `BoardListService`, `NavigationService`, `localStorage`. No new dependencies.

## 2.2 Structure

### New shared component: `EmptyStateComponent` (`components/empty-state/`, `app-empty-state`)
- Presentational. `@Input({required: true}) title!: string` (phrase key), `@Input() titleParams: Record<string, string | number> = {}`, `@Input() hint = ''` (phrase key), `@Input() hintParams = {}`. Actions are projected (`<ng-content>`) into `.emptyState__actions`, which is hidden when empty (`:empty`).
- Markup: a `<div class="emptyState">` with a `<p class="emptyState__title">` (not a heading, so it doesn't disturb the screen's heading order), a `<p class="emptyState__hint">` and the actions row. Left-aligned like the list it replaces. Title in `--color-text-heading`, `--font-md`, weight 600; hint `--color-text-muted`, `--font-sm`; actions in a wrapping flex row with `gap: var(--space-2)`; vertical spacing from the `--space-*` tokens. No card, border or illustration.
- Created with `npm run newcomponent empty-state`, `ChangeDetectionStrategy.Eager`, its own spec covering title/hint params and the hidden hint when `hint` is empty.

### New component: `CreateBoardDialogComponent` (`components/create-board-dialog/`, `app-create-board-dialog`)
- Moves the create-board dialog out of `components/sidebar-boards/`: the `app-create-named-item-dialog` with `app-board-template-select`, `selectedTemplateId`, `createErrorMessage` and the `BoardService.createBoard(teamCode, title, selectedProjectId, templateId)` call, plus `BoardListService.add`. Outputs `created: EventEmitter<BoardSummary>` and `cancelled`.
- `SidebarBoardsComponent` renders it behind `isCreateDialogOpen` and navigates with `boardRoute` on `created`. The sidebar spec's create tests move to the new component's spec. The sidebar keeps a test that the create row opens the dialog and that `created` opens the board.

### New component: `HomeGetStartedComponent` (`components/home-get-started/`, `app-home-get-started`)
- Reads `TeamService.features$` and `getCurrentRole()`. Buttons use `app-button` (`variant="ghost"`, icons from the existing `IconName` set: `page`, `diagram`, `board`; Invite teammates has no icon, and no new icons are added). New page/diagram navigate to `[AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES | AppRoutes.DIAGRAMS, AppRoutes.NEW]`. New board opens `app-create-board-dialog` and navigates with `boardRoute` on `created`. Invite teammates calls `NavigationService.navigate(AppRoutes.MANAGE_TEAM)`, the same call the header's account menu makes.
- `@Output() dismissed`. The close control is `app-icon-button icon="x"` with `tooltip` `HIDE_GET_STARTED`.
- `get hasActions(): boolean` for Home to check before showing the block.
- Heading: an `h3` with a `homeGetStarted__title` class, at the same level as the sibling Home section titles (`activityInbox__title`, `favoritesGrid__title`).

### Home wiring (`pages/dashboard/home/home.component.{ts,html}`)
- `ActivityInboxComponent` gets `@Output() emptyChange = new EventEmitter<boolean>()`. It emits after each successful load while `filter === 'all'` (`notifications.length === 0`) and emits `false` when a live `upserted$` notification arrives. Unread-filter loads and errors emit nothing.
- Home keeps `activityEmpty: boolean | null = null`, reads `favoriteService.homeFavorites$` and a `dismissed` flag from `localStorage` key `homeGetStartedDismissed:<teamCode>` (read and write wrapped in try/catch). It shows `app-home-get-started` above `app-activity-inbox` when `activityEmpty === true`, there are no favorites, it isn't dismissed and the component has actions. Because `hasActions` lives on the child, Home computes the same role and feature check through a small exported pure function `getStartedActions(features, role)` in `components/home-get-started/home-get-started.component.ts`, which both use.
- On `dismissed`, Home writes the key and hides the block.

### Diagram view-mode empty state
- `components/flowchart-editor/flowchart-editor.component.{ts,html,css}`: add `hasLoaded = false`, set `true` at the end of `loadContent`. Add a second projection slot: `<div class="flowchartEditor__emptyState" *ngIf="isEmpty && hasLoaded && !editable">` with `<p>` `FLOWCHART_EMPTY_VIEW` and `<ng-content select="[flowchartEmptyAction]">`. The wrapper has `pointer-events: none`, its projected children `pointer-events: auto`. It's centred like `.flowchartEditor__emptyHint`, with text in `--color-text-muted`. The default `<ng-content>` (comment layer) keeps working. Check that `hasLoaded` changing during `ngAfterViewInit` doesn't raise `ExpressionChangedAfterItHasBeenChecked` in dev mode; if it does, set the flags before the first check the same way `isEmpty` is handled for the edit hint.
- `pages/dashboard/diagram-detail/diagram-detail.component.html`: inside the view-mode `app-flowchart-editor`, add `<app-button flowchartEmptyAction variant="primary" (pressed)="handleEdit()">{{ PHRASES.EDIT_DIAGRAM | translate }}</app-button>`.

### Lists
- `pages/dashboard/foldered-list-page.base.ts`: add `clearSearch()` (sets `searchQuery = ''` and calls `this.searchTerms.next('')`, so `distinctUntilChanged` stays in sync), `showAllProjects()` (`projectFilterService.select(null)`) and a `selectedProjectName` getter (from `projectFilterService.getProjects()`). The subclasses supply the phrase keys through new abstract members or constructor config next to the existing `itemRoute` / `itemType` (`emptyTitle`, `emptyInProjectTitle`, `emptyHint`).
- `pages/dashboard/document-pages/document-pages.component.html` and `pages/dashboard/diagrams/diagrams.component.html`: replace the two `<p class="dashboardStub__body">` lines with `app-empty-state` blocks for no matches and for first use (with and without a project), same `*ngIf` conditions as today. **New page** / **New diagram** call `handleCreateItem(null)`; **Browse templates** navigates to `templatesRoute(this.templateKind)` from `@utils/templateRoute`.
- `pages/dashboard/projects/projects.component.{ts,html}`: `app-empty-state` for no matches (with `clearSearch()`, same pattern) and for no projects (role-dependent hint, **New project** calling `handleNewProject()` when `canCreate`).
- `pages/dashboard/project-detail/project-detail.component.{ts,html}`: `app-empty-state` with the hint and **Select this project** (`projectFilterService.select(project.id)`) when `getSelectedProjectId() !== project.id`.
- `pages/dashboard/trash/trash.component.{ts,html}`: `app-empty-state` for both cases; `clearFilters()` empties `searchQuery`, pushes `''` to `searchTerms` and sets `typeFilter = null`, loading once.
- `components/template-list/template-list.component.{ts,html}`: no-matches `app-empty-state` with `clearSearch()`.
- `components/my-work/my-work.component.html`, `components/activity-inbox/activity-inbox.component.html`, `components/favorites-list/favorites-list.component.html`: copy only (changed translation text).

### Phrases and translations
In `config/phrases.ts` and every file in `frontend/public/assets/translations/` (en, lv, et, lt, ru, sv, fi, de, da, fr, es). Add each key next to related keys, not at the end:
- New: `GET_STARTED_TITLE` ("Get your team started"), `GET_STARTED_HINT`, `INVITE_TEAMMATES` ("Invite teammates"), `HIDE_GET_STARTED` ("Hide getting started"), `FLOWCHART_EMPTY_VIEW` ("This diagram is empty"), `EDIT_DIAGRAM` ("Edit diagram"), `EMPTY_PAGES_TITLE`, `EMPTY_PAGES_IN_PROJECT_TITLE`, `EMPTY_PAGES_HINT`, `EMPTY_DIAGRAMS_TITLE`, `EMPTY_DIAGRAMS_IN_PROJECT_TITLE`, `EMPTY_DIAGRAMS_HINT`, `BROWSE_TEMPLATES`, `SHOW_ALL_PROJECTS`, `NO_MATCHES_TITLE` ("Nothing matches '{{query}}'"), `NO_MATCHES_TITLES_HINT`, `NO_MATCHES_PROJECTS_HINT`, `NO_MATCHES_IN_PROJECT_HINT`, `CLEAR_SEARCH`, `TRASH_CLEAR_FILTERS` ("Clear filters"), `TRASH_NO_MATCHES`, `PROJECTS_EMPTY_MEMBER_HINT`, `NO_PROJECT_ITEMS_HINT`, `SELECT_THIS_PROJECT`. Reuse `NEW_PAGE`, `NEW_DIAGRAM`, `NEW_BOARD`, `NEW_PROJECT` for the buttons.
- Changed text: `ACTIVITY_EMPTY`, `NOTHING_ASSIGNED`, `NO_FAVORITES_SIDEBAR`, `NO_PROJECTS_YET` ("No projects yet", trailing period dropped since it is now a title).
- Removed once unused: `NO_PAGES_YET`, `NO_DIAGRAMS_YET`. `NO_SEARCH_RESULTS` is also used by global search (owned by `global-search-polish`). Remove it only if a grep on your rebased branch shows no remaining use, never by editing the global search files.

### Parallel work
- `global-search-polish` stops using `NO_SEARCH_RESULTS` in global search. The same grep-before-remove rule applies there.
- `new-item-split-button` changes the toolbar's "New page" / "New diagram" buttons and the folder "+". This spec doesn't touch them. Its empty-state buttons are separate and call `handleCreateItem(null)`.
- `create-flow-opens-item` changes what happens after Create. The empty-state buttons only open the same create route.
- `row-actions-keyboard-access` changes `sidebar-boards` CSS. This spec moves only the create dialog markup and handlers out of `sidebar-boards.component.{ts,html}`.
- `account-pages-in-shell` may move Manage team into the dashboard. *Invite teammates* uses the same `NavigationService.navigate(AppRoutes.MANAGE_TEAM)` call as the header, so whichever branch merges second updates both together (grep `MANAGE_TEAM`).
- `item-title-hierarchy` may change heading levels on Home. Keep the get-started heading at the same level and style as the other Home section titles, so its change applies to all of them.
- `accessible-control-names` adds an accessible name to the Pages/Diagrams search inputs in the same templates. Only the empty-state lines at the bottom change here.
- `theme-contrast` changes `--color-text-faint`. The new styles use `--color-text-muted` and `--color-text-heading` only.

## 2.3 Decisions
1. **Empty states say what will be here, why it's empty and the next step.** Reason: Impeccable onboard.md, "Empty states are onboarding opportunities" (what will be here, why it matters, a clear CTA). Operate mode: "Empty states that teach the interface, not 'nothing here'". clarify.md: "An empty state distinguishes first use, no results, filters, permissions, and failure."
2. **First use, no matches, filtered by project, and no permission each get their own text** (Pages/Diagrams with and without a project, Projects for creators vs members, Trash filters). Reason: clarify.md, empty-state types. A selected project explains most "empty" lists, and **Show all projects** is the recovery.
3. **One shared `EmptyStateComponent`, plain text plus buttons, no card or illustration.** Reason: CLAUDE.md, reuse shared components. Impeccable operate.md, Restrained and consistency. craft-floor.md rejects "icon plus heading plus text" cards and sketch-style illustrations as filler. Rejected: an illustration per screen (decoration in an Operate surface); a new `styles.css` class (the actions and params need a component).
4. **The empty-state title is a `<p>`, not a heading.** Reason: it's a status, not a section. Adding headings would fight `item-title-hierarchy`'s heading order (WCAG 1.3.1).
5. **Home day one gets a "Get started" row of actions, not cards or a tour.** Reason: onboard.md, "Context over ceremony", "Get users to their aha moment ASAP", "Make it optional"; craft-floor.md, no same-size card grids. Rejected: a guided tour or welcome modal (operate.md: "Modal as first thought… laziness"); always-visible quick-create buttons on Home (noise for established users, and the sidebar already has creates).
6. **The block shows when Activity (All) is empty and there are no favorites, and is dismissible per team.** Reason: these two say "nothing has happened for you yet" without any new request. onboard.md: "Show onboarding once: track completion and respect dismissals". Hidden until Activity has loaded, so it never flashes. Rejected: checking whether the team has any content (needs new API calls or an endpoint).
7. **"Invite teammates" opens Manage team** (owner/admin only). Reason: joining works through the team code shown there; there is no invite-by-email flow. Regular members can't open Manage team, so they don't get the button.
8. **"New board" on Home reuses the sidebar's dialog, extracted into `CreateBoardDialogComponent`.** Reason: Nielsen #4, the same flow everywhere, and no duplicated create logic. Rejected: copying the handler into Home (two places to keep in sync).
9. **The empty diagram in view mode offers *Edit diagram* in place.** Reason: onboard.md, CTA at the point of need. Every member may edit diagrams (`canManage` is always on for diagrams). The message is non-blocking (`pointer-events: none` except the button) so comment placement still works.
10. **No-match states offer "Clear search" / "Clear filters"** and say what search covers ("titles only", "names and descriptions"). Reason: onboard.md, "No results: suggest different query, clear filters". harden.md, "Provide clear next action". The scope text matches the backend: Pages, Diagrams, Trash and Templates search titles; Projects search name and description.
11. **The dismissal lives in `localStorage`, read and written inside try/catch.** Reason: it's a per-viewer convenience, like `chatChannelOrder:<team>`. Losing it only shows the block again on a still-empty Home.

### Decisions to double-check
12. **Project detail offers "Select this project"**, which changes the header's project selector so new items land in the project. This is a new shortcut to an existing setting. Drop the button if you'd rather the empty state be text only.
13. **The sidebar's create-board dialog moves into its own component.** This is a small refactor of `sidebar-boards` beyond pure empty-state work, done so Home can open the same dialog.

### Clarifications during implementation
14. **The Trash action uses a new key `TRASH_CLEAR_FILTERS` ("Clear filters")** (2026-11-04). `CLEAR_FILTERS` already exists as "Clear" for the ticket filter's button, which stays unchanged.
15. **`NO_PROJECTS_YET` drops its trailing period** (2026-11-04), so it reads like the other empty-state titles.
16. **`FlowchartEditorComponent` calls `ChangeDetectorRef.detectChanges()` at the end of `ngAfterViewInit`** (2026-11-04). Setting `hasLoaded` there raised NG0100 in dev mode, as 2.2 warned; the flags depend on the X6 graph, which only exists after the view, so a local re-check is the standard fix. It also covers the existing edit hint's `isEmpty` flip.
17. **List empty-state buttons use the `ghost` variant** (2026-11-04). The toolbar above already holds the screen's one primary button (*New page*, *New project*), so a second primary in the empty state would compete with it (Impeccable: one primary action per view). The empty diagram's *Edit diagram* stays `primary`, as 2.2 says, since view mode has no other primary action on the canvas.
18. **Pages and Diagrams hide the empty state while `alertMessage` shows** (2026-11-04), so a failed load shows only its error (rule "Empty states never replace an error").

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Shared building blocks
- [x] A1. Add all new phrase keys and the changed texts from 2.2 to `config/phrases.ts` and every translation file, next to related keys.
- [x] A2. Create `EmptyStateComponent` (`npm run newcomponent empty-state`) with the inputs, markup and token-only CSS from 2.2, plus a spec (title and hint params rendered, hint omitted when empty, projected actions shown).
- [x] A3. Create `CreateBoardDialogComponent` by moving the dialog, its state and `handleCreateConfirmed` logic out of `sidebar-boards`. Make `SidebarBoardsComponent` use it and navigate on `created`. Move the three create tests from `sidebar-boards.component.spec.ts` into the new component's spec; the sidebar keeps "opens the create dialog" and a "navigates to the created board" test.

### B. Home
- [x] B1. Add `emptyChange` to `ActivityInboxComponent` as in 2.2, with specs: emits `true` after an empty All load, `false` after a non-empty load or a live upsert, nothing on the Unread filter or on error.
- [x] B2. Create `HomeGetStartedComponent` and the exported `getStartedActions(features, role)` function with the four actions, feature and role filters, `dismissed` output and the create-board dialog. Spec: `getStartedActions` for owner/admin/user with features on and off; each button's navigation; New board opens the dialog and navigates on `created`.
- [x] B3. Wire Home (`home.component.{ts,html}`): `activityEmpty`, favorites, the `homeGetStartedDismissed:<teamCode>` flag (try/catch) and the show condition. Extend `home.component.spec.ts`: hidden while Activity loads; shown when Activity is empty, there are no favorites and it isn't dismissed; hidden with a favorite, after a notification, after dismissal (and the key is written), and when no action is allowed.
- [x] B4. Copy for the Activity, My work and sidebar Favorites empty lines (translation text only; templates unchanged unless a key name changes).

### C. Diagram view mode
- [x] C1. Add `hasLoaded`, the view-mode empty state and the `[flowchartEmptyAction]` slot to `FlowchartEditorComponent` (CSS stays under the 4 kB budget). Extend `flowchart-editor.component.spec.ts`: an empty read-only editor shows the view message after load; a non-empty one doesn't; an editable one shows only the existing hint.
- [x] C2. Project the *Edit diagram* button from `diagram-detail.component.html`. Add a diagram-detail spec, or extend the existing one, that the button calls `handleEdit`.

### D. Lists
- [x] D1. Pages and Diagrams: `clearSearch`, `showAllProjects`, `selectedProjectName` and the per-type phrase config in `foldered-list-page.base.ts`; the `app-empty-state` blocks in `document-pages` and `diagrams`. Extend `document-pages.component.spec.ts`: first-use vs in-project titles, no-match state with Clear search (search term reset through `searchTerms`), Show all projects calls `select(null)`.
- [ ] D2. Projects: both empty states with role-dependent hint and actions, `clearSearch`. Extend `projects.component.spec.ts` for the creator vs member variant and Clear search.
- [ ] D3. Project detail: empty state with **Select this project** only when it isn't already selected. Extend `project-detail.component.spec.ts`.
- [ ] D4. Trash: empty and no-match states with `clearFilters()`. Extend `trash.component.spec.ts`: Clear filters resets search and type and loads once.
- [ ] D5. Template list: no-match state with `clearSearch()`. Extend `template-list.component.spec.ts`.
- [ ] D6. Remove `NO_PAGES_YET` and `NO_DIAGRAMS_YET` from `phrases.ts` and every translation file. Remove `NO_SEARCH_RESULTS` only if a grep shows it unused (see 2.2).

### E. Docs
- [ ] E1. Update `CLAUDE.md`: list `EmptyStateComponent` (`app-empty-state`) as the shared empty state for lists and searches, `CreateBoardDialogComponent` as the create-board dialog shared by the sidebar and Home, and Home's get-started block (its show rule and `homeGetStartedDismissed:<team>` key) in the Home bullet.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test` and `npm run build` in `frontend/`; the backend suite is unaffected but run `bin/rails test` once).
- [ ] Z2. Manual check in the running app: register, create a team, and on Home see "Get started" with all four buttons. Each one works; dismiss it and it stays hidden after a reload. Open an empty diagram and use *Edit diagram*. Empty Pages with and without a project selected, a Pages search with no matches (Clear search), Projects as an admin and as a member, an empty project detail, Trash with a filter that matches nothing (Clear filters), and a template search with no matches. Check all of it in light and dark mode at 375 px width.
