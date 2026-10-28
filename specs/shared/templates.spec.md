# Templates — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-28

# Part 1 — Business logic and usage

Teams write the same kinds of documents, diagrams and boards over and over: meeting notes, feature docs, a flowchart skeleton, a board with the team's usual columns and priorities. Templates let a team keep those starting points and create new items from them.

Pages and diagrams get a **Templates** tab next to their item tree, and boards get a **Board templates** screen reached from the sidebar. Templates are team-wide. The **New page** and **New diagram** buttons become a dropdown (**Blank** or **From template**), and the create board dialog gets a template select. The app also ships a few read-only, English **built-in** templates for pages and diagrams.

A template is a starting point only: an item created from one is an independent copy. Changing or deleting a template never touches items made from it.

- **Users:** any member of a team that has the matching feature (pages, diagrams or boards) turned on.

- **Usage — Templates tab (pages and diagrams):**
  1. The Pages screen gets a tab bar at the top: **Pages** | **Templates** (Diagrams: **Diagrams** | **Templates**). Pages stays at `/dashboard/pages`; Templates is at `/dashboard/pages/templates` (diagrams: `/dashboard/diagrams/templates`).
  2. The Templates tab shows a search field, a **New template** button and a list:
     - First a **Built-in** group with the shipped templates (always shown in full; the search filters it by name on the client).
     - Then the team's templates, ordered by name A→Z, 50 at a time with **Load more**, searched by name on the server (300 ms debounce). Each row shows the name, the creator's nickname and the last update time.
     - Empty state when the team has none: "No templates yet". No search results: the existing "No results" text.
  3. **New template** opens the usual item popup in create mode at `…/templates/new` with an empty title and content. There is no project, folder, favourite star, comments, editing presence or copy link. **Create** saves it and returns to the Templates tab, placing the new template in the list.
  4. Clicking a team template opens it at `…/templates/:id` in the same popup. The creator, team admins and the owner see **Edit** and **Delete**; other members see it read-only. Saving works like pages and diagrams, including the edit conflict dialog (*Load latest* / *Overwrite*).
  5. Clicking a built-in template opens it read-only at `…/templates/builtin/:key`, with a **Duplicate** action that creates an editable team template with the same name and content and opens it.
  6. Each row (built-in or team) has a **Use template** action, which starts creating a page or diagram from it (see below). Team template rows the user can manage also have **Delete** (with a confirm dialog, deleted for good).

- **Usage — creating a page or diagram:**
  1. **New page** (and **New diagram**) in the toolbar becomes a dropdown with **Blank** and **From template**. The folder **+** in the item tree gets the same dropdown.
  2. **Blank** behaves as today: the create popup at `…/new` (with `?folder=<id>` for a folder's +).
  3. **From template** opens a template picker dialog: a search field, the built-in group, then the team's templates (50 at a time with Load more). Picking one closes the dialog and opens the create popup at `…/new?template=<id>` (or `?template=builtin:<key>`), keeping `?folder=<id>` when started from a folder.
  4. The create popup's content is prefilled from the template. The title keeps the usual empty draft with the "Untitled" placeholder. Nothing is saved until **Create**, which sends the normal create request.
  5. If the template can't be loaded (deleted, feature off, unknown built-in key), the popup opens blank with the error in its alert.
  6. **Use template** on a Templates tab row does the same as picking it in the picker, without a folder.

- **Usage — Board templates:**
  1. The sidebar boards section gets a **Board templates** row below **Create board**. It opens `/dashboard/board-templates`, a screen with a search field, a **New template** button and the team's board templates (A→Z, 50 at a time, server search). There are no built-in board templates. Empty state: "No board templates yet".
  2. **New template** offers **Blank** and **From existing board**:
     - **Blank** opens the board template editor with name "Untitled", the default columns (To Do, Doing, Done) and the default priorities.
     - **From existing board** opens a picker of the boards the user can see (the sidebar's board list); the editor then opens prefilled with that board's column titles in order and its priorities (name, colour, order), with the board's title as the name.
     - Nothing is saved until **Create** in the editor.
  3. The board template editor (at `/dashboard/board-templates/new` and `/dashboard/board-templates/:id`) has the name, an ordered list of column titles (add, rename, reorder by drag, remove) and an ordered list of priorities (add, rename, recolour, reorder, remove), like the board Overview tab's priority list. Members who can't manage the template see it read-only. **Save** stores the whole template; edit conflicts show the edit conflict dialog.
  4. Deleting a board template (confirm dialog) deletes it for good.

- **Usage — creating a board:**
  1. The sidebar create board dialog gets a **Template** select under the name: **Default (To Do, Doing, Done)** first, then the team's board templates by name. The first 50 load when the dialog opens; the select's search box searches the rest on the server.
  2. **Create** with a template makes the board with the template's columns and priorities instead of the defaults. The name field behaves as today ("Untitled board" default).
  3. If the template was deleted meanwhile, creating fails with "This template no longer exists" and the dialog stays open.

- **Built-in templates (shipped in the frontend, English only, read-only):**
  - Pages: **Feature documentation**, **Meeting notes**, **Concept**, **Performance improvement plan**.
  - Diagrams: **To-do checklist** (start → task boxes → done), **Simple flowchart**, **Decision tree**.
  - Their names and content are English in every language and are never translated. They can't be edited or deleted, only used or duplicated.

- **Rules:**
  - Templates are team-wide: every active member of the team sees every template of a kind. They have no project and no folder.
  - Any member can create a template. Only its creator, the team's admins and the owner can edit or delete it. The API returns `can_manage` per template and answers 403 `FORBIDDEN` otherwise.
  - Template endpoints follow the kind's team feature flag (`pages`, `diagrams`, `boards`): a disabled kind answers 403 `FEATURE_DISABLED`, its Templates tab and screen are hidden, and the board templates row and select disappear with boards.
  - Limits: names up to `TITLE_MAX_LENGTH` (200); page and diagram template content up to `CONTENT_MAX_BYTES` (1 MB). Board template column titles up to `TITLE_MAX_LENGTH`, priority names up to 40 characters with colours from `BoardPriority::COLORS`, priority names unique within the template (case-insensitive). A board template may have no columns or no priorities.
  - Page template HTML is sanitised with the same sanitiser as pages.
  - Creating a board from a template copies columns and priorities only. "From existing board" copies only column titles and priorities, never tickets, assignees, project or anything else.
  - Templates use optimistic locking (`lock_version`) like pages and diagrams.
  - A removed member's or deleted account's templates stay; they show the creator's last nickname, and only admins and the owner can manage them.
  - Templates never appear in global search, favourites, My Work, project counts or the Home screen. There are no live updates for templates.
  - Deleting a template is permanent (no trash) and doesn't affect items created from it.

- **Out of scope:**
  - Ticket templates: a later spec.
  - Built-in board templates, and translated built-ins: decided against.
  - Board tags or other board rules in templates: boards have none yet; a later spec that adds them extends board templates.
  - "Save as template" from an existing page or diagram: page and diagram templates are built from scratch (only board templates can copy an existing board).
  - Attachments in templates: see Related specs.
  - Project-scoped or personal templates.

### Related specs
- **Trash:** templates are their own table, not pages, diagrams or boards, and are **not** trashable: deleting one is permanent after a confirm dialog. The trash spec's note that "templates go to the trash like any other item" no longer holds and should be corrected there. Items created from a template are normal items and go to the trash as usual. Trashed boards drop out of the "From existing board" picker through the trash default scope; the picker uses the normal board list, so nothing extra is needed.
- **Attachments:** templates hold no attachments. The template editors offer no upload, and page template content keeps only what the page sanitiser allows; if the attachments spec embeds attachment images in page HTML, the template sanitiser must strip them so templates never reference a page's blobs. A page created from a template therefore starts with no attachments. This spec adds no template type to `Attachment::TEMPLATE_TYPES` (it stays `[]`), so the attachments spec's template-image references (an item made from a template sharing the template's image ids) never come into play. Template images could be a later spec, which would add `Template` to `TEMPLATE_TYPES` and stop stripping images.
- **Ticket tags** (`ticket-tags.spec.md`): board templates copy columns and priorities. Once both specs are merged, they also copy the board's tags (without ticket links): "From existing board" includes them and creating a board from a template creates them. Whichever spec is merged second wires this.
- **Comments, mentions, notifications inbox, copy link, chat:** no interaction. Template popups have no comments or copy link button; mentions in template content are plain text the editor inserts like in pages, if the mentions spec adds a Tiptap node it is allowed in templates as in pages (the item is copied as is when used).

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies. Uses Rails and ActiveRecord, the existing page HTML sanitiser, `ContentLimits`, `FeatureGated`, `paginate`, `TitleSearchable`; on the frontend the existing `ItemDetailLayoutComponent`, `RichTextEditorComponent`, `FlowchartEditorComponent`, `MenuButtonComponent`, `DropdownComponent`, `ConfirmDialogComponent`, `EditConflictDialogComponent`, `LoadMoreComponent`, `PriorityColorPickerComponent`, Angular CDK drag-drop and ngx-translate.

## 2.2 Structure

### Data model
New table `templates` (added to the single `create_schema` migration, per the project's schema approach):

| column | type | notes |
|---|---|---|
| `team_id` | integer, not null, indexed | |
| `created_by_user_id` | integer, not null, indexed | `creator` association |
| `kind` | string, not null | `page`, `diagram` or `board` |
| `title` | string, not null | |
| `content` | text, not null, default `""` | page HTML, diagram X6 JSON, or board JSON (below) |
| `lock_version` | integer, not null, default 0 | |
| timestamps | | |

Indexes: `[team_id, kind]`, and a `pg_trgm` GIN index on `LOWER(title)` for the name search.

Board template `content` is JSON: `{"columns": ["To Do", "Doing", "Done"], "priorities": [{"name": "Low", "color": "blue"}, ...]}`, in order. The model validates its shape (arrays, strings, lengths, colours, unique priority names) and renders 422 `TEMPLATE_CONTENT_INVALID` when it doesn't hold.

Model `Template` (`app/models/template.rb`): `belongs_to :team`, `belongs_to :creator`, `include ContentLimits`, `include TitleSearchable`, `KINDS = %w[page diagram board]`, validations above, `before_validation` sanitising page content with the page sanitiser, `board_columns` / `board_priorities` readers for board content, and `Template.board_content_from(board)` building board content from a board's columns and priorities. `Team has_many :templates, dependent: :delete_all`.

### API
`TemplatesController` (team-scoped `before_action` chain, `FeatureGated`), routes `resources :templates, only: [:index, :create, :show, :update, :destroy]` under `teams/:team_code`:

- `GET /teams/:team_code/templates?kind=page&search=&offset=` → `{ templates: [summary], has_more }`. `kind` is required (422 `TEMPLATE_KIND_INVALID`); `require_feature!(kind)`; ordered by `LOWER(title), id`; skips `content`. Summary: `{ id, kind, title, creator, can_manage, lock_version, created_at, updated_at }`.
- `GET /teams/:team_code/templates/:id` → `{ template: summary + content }`. 404 `TEMPLATE_NOT_FOUND` for another team's id.
- `POST /teams/:team_code/templates` with `{ template: { kind, title, content } }` → 201 `{ template }`. Title defaults through `title_or_default`. Errors: `limit_error_code` then `TEMPLATE_CONTENT_INVALID` / `TEMPLATE_CREATE_FAILED`.
- `PATCH /teams/:team_code/templates/:id` with `{ template: { title, content, lock_version } }` → `{ template }`. `can_manage` required (403 `FORBIDDEN`); `assign_lock_version`; 409 `EDIT_CONFLICT` with the latest template; `TEMPLATE_UPDATE_FAILED`.
- `DELETE /teams/:team_code/templates/:id` → 204. `can_manage` required.

"From existing board" needs no endpoint: the frontend loads the board (`GET boards/:id`, which already returns columns and priorities) and fills the editor.

`can_manage`: creator, or the user's role is `admin` or `owner`.

`BoardsController#create` accepts `template_id` in `create_board_params`. With it, the template is looked up in `@team.templates.where(kind: "board")` (404 `TEMPLATE_NOT_FOUND`, with boards on), and inside one transaction the board is created, its default priorities from the `after_create` are replaced by the template's priorities, and the template's columns are created instead of `DEFAULT_COLUMN_TITLES`. Without it, nothing changes.

Strong params `create_template_params` and `update_template_params` go in `ApplicationController`. New error module `ErrorCodes::Templates`: `TEMPLATE_NOT_FOUND`, `TEMPLATE_CREATE_FAILED`, `TEMPLATE_UPDATE_FAILED`, `TEMPLATE_KIND_INVALID`, `TEMPLATE_CONTENT_INVALID`.

### Frontend
- **Routes** (`AppRoutes`: `TEMPLATES = 'templates'`, `BUILTIN = 'builtin'`, `BOARD_TEMPLATES = 'board-templates'`), in `dashboardRoutes` before the `:id` routes:
  - `pages/templates` → `PageTemplatesComponent`; `pages/templates/new`, `pages/templates/:id`, `pages/templates/builtin/:key` → `PageTemplateDetailComponent`. Same for diagrams. All with `featureGuard` of the kind.
  - `board-templates` → `BoardTemplatesComponent`; `board-templates/new` and `board-templates/:id` → `BoardTemplateDetailComponent`; `featureGuard('boards')`.
- **Tabs:** a small `ItemTabsComponent` (`components/item-tabs/`) with the two router links, used at the top of `DocumentPagesComponent`, `DiagramsComponent` and the two templates screens.
- **Models:** `models/template.model.ts`: `TemplateKind`, `TemplateSummary`, `TemplateDetail`, `BoardTemplateContent`, `BuiltInTemplate` (`key`, `kind`, `title`, `content`).
- **Built-ins:** `config/builtInTemplates.ts` exports `BUILT_IN_TEMPLATES`: the four page templates as Tiptap-compatible HTML (headings, paragraphs, bullet and task lists the page editor supports) and the three diagram templates as X6 JSON built from the flowchart editor's shapes (`flow-terminator`, `flow-process`, `flow-decision`, `flow-io` and edges), with English titles as plain strings (not `PHRASES`).
- **Service:** `TemplateService` (`services/template.service.ts`): `list(teamCode, kind, search, offset)`, `get`, `create`, `save` (through `versionedRequest`), `delete`, with `mapTemplateSummary` / `mapTemplateDetail`; plus `resolve(teamCode, kind, ref)` returning the content of a team template id or a `builtin:<key>` ref. `BoardService.createBoard` gains an optional `templateId`.
- **Templates list:** `TemplateListComponent` (`components/template-list/`): search, built-in group, team rows with Load more, row actions (open, Use template, Delete). Used by `PageTemplatesComponent` and `DiagramTemplatesComponent` (thin config classes, like the page and diagram list classes) and by `BoardTemplatesComponent` (no built-ins, no Use template).
- **Template detail (pages, diagrams):** `PageTemplateDetailComponent` and `DiagramTemplateDetailComponent` on a shared `TemplateDetailBase` (`pages/dashboard/template-detail.base.ts`) that reuses `ItemDetailLayoutComponent` with project, favourite, folder and editing presence turned off by inputs (new inputs where the layout doesn't already allow hiding them), plus a **Duplicate** action for built-ins. Esc goes through `EscapeService` like the item popups.
- **Picker:** `TemplatePickerDialogComponent` (`components/template-picker-dialog/`) for pages and diagrams, emitting the picked ref.
- **New dropdown:** the Pages and Diagrams toolbar buttons become `app-menu-button` with Blank / From template; `ItemTreeComponent`'s folder + emits `createItem` with a `fromTemplate` flag through the same menu. `FolderedListPageComponent` opens the picker and navigates to `…/new?template=<ref>&folder=<id>`.
- **Create mode:** `FolderedItemDetailComponent.startCreate()` reads `?template=` and, if present, loads the content through `TemplateService.resolve` into `draftContent` (and the initial content, so an unchanged prefilled draft still counts as a draft for the discard confirm). A failure shows the error in the alert and leaves the draft blank.
- **Board templates:** `BoardTemplateDetailComponent` with name, a CDK drag list of column titles and a priority editor reusing `PriorityColorPickerComponent`; a board picker dialog for "From existing board" built on `BoardListService.boards$`.
- **Board create dialog:** `SidebarBoardsComponent` replaces `CreateNamedItemDialogComponent` for boards with a `CreateBoardDialogComponent` (name field plus a `DropdownComponent` template select with server search), and passes `templateId` to `createBoard`. The sidebar gets the **Board templates** row.
- **Errors and i18n:** `config/errorCodes/templates.ts` mirroring the backend; `PHRASES` and all 11 translation files get the new UI strings (tab labels, New template, Blank, From template, From existing board, Use template, Duplicate, Built-in, Board templates, Template, Default (To Do, Doing, Done), empty states, confirm texts, column and priority editor labels) and `ERRORS.TEMPLATES.*`. Built-in names and content are not translated.

## 2.3 Decisions
1. **Where do templates live?** A Templates tab on the Pages and Diagrams screens with its own URL, and a Board templates screen reached from a sidebar row (boards have no list screen). Rejected: one shared Templates screen; managing templates only from the New dropdown; a new Boards list screen with tabs.
2. **Scope?** Team-wide, no project. Rejected: project-scoped (visibility rules, cleanup), personal.
3. **Permissions?** Any member creates; creator, admins and owner edit and delete. Rejected: everyone full control; admins and owner only.
4. **Ticket templates?** Not in this spec; a later one.
5. **Board template contents?** Column titles and priorities. Boards have no tags or other rules yet; a later spec adding them extends board templates.
6. **Authoring?** Page and diagram templates are built from scratch. Board templates can be built from scratch or from an existing board, offered only on the Board templates screen (not on the board's Overview tab). No "Save as template" on pages or diagrams.
7. **Built-in templates?** Shipped in the frontend code, read-only, can be used or duplicated, no backfill. English only: names and content are never translated. Set: pages Feature documentation, Meeting notes, Concept, Performance improvement plan (PIP = Performance Improvement Plan); diagrams To-do checklist (start → task boxes → done), Simple flowchart, Decision tree. No board built-ins. Rejected: seeding per team; translated content.
8. **Storage?** A separate `templates` table with `kind` and a `content` text column (board content as JSON), so templates never leak into lists, search, favourites, My Work, project counts or trash. Rejected: an `is_template` flag on pages, diagrams and boards.
9. **Create-from-template flow for pages and diagrams?** New becomes a Blank / From template dropdown (toolbar and folder +); From template opens a picker dialog, then the existing create popup at `…/new?template=<ref>` prefilled; nothing saved until Create. Rejected: listing templates in the dropdown; blank-only folder +.
10. **Board create flow?** A template select in the create board dialog, default first; the backend copies columns and priorities from `template_id`. Rejected: a separate Blank / From template dropdown on the sidebar row.
11. **Editing?** Reuse the item popup and editors for page and diagram templates, without project, folder, favourites, comments or presence; a small dedicated editor for board templates. Templates keep `lock_version` and the edit conflict dialog.
12. **Deleting a template?** Permanent, with a confirm dialog; no trash. Created items are unaffected.
13. **Attachments?** None in templates; template content can't reference blobs.
14. **Title of an item created from a template?** The usual Untitled default; the template only provides content (or columns and priorities).
15. **Lists?** Built-ins first, then team templates A→Z, 50 per page with Load more and server search. No live updates.
16. **Visibility elsewhere?** Templates appear only in their tabs, screens and pickers: not in global search, favourites, My Work or Home.
17. **Empty board templates?** A board template may have zero columns or zero priorities (the board then starts with only the backlog, or no priorities), matching boards today, where every column and priority can be deleted. Decided by the coordinator under the user's delegation on 2026-10-28.
18. **Trash and attachments specs' assumptions?** The trash spec assumed templates are trashable items, and the attachments spec assumed templates could own inline images. Both conflict with decisions 8, 12 and 13, which the user made directly, so templates stay out of the trash and `Attachment::TEMPLATE_TYPES` stays empty. The coordinator's later request to put templates in the trash and share template images was set aside because the user's own answers take precedence (2026-10-28).

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: record the backend (`bin/rails test`) and frontend (`npm test`) test counts here.

### A. Data model
- [ ] A1. Add the `templates` table to the `create_schema` migration (columns, `[team_id, kind]` index, trigram index on `LOWER(title)`), rebuild the database and update `db/schema.rb` with only this table's changes.
- [ ] A2. `app/models/template.rb` with associations, `KINDS`, `ContentLimits`, `TitleSearchable`, page content sanitising, board content validation, `board_columns` / `board_priorities`, `Template.board_content_from(board)`; `Team has_many :templates, dependent: :delete_all`. Fixtures in `test/fixtures/templates.yml` (a page, a diagram and a board template).
- [ ] A3. `test/models/template_test.rb`: kind validation, limits, page sanitising, board content validation (bad shape, bad colour, duplicate priority names, too-long titles), `board_content_from`.

### B. API
- [ ] B1. `ErrorCodes::Templates` module; `create_template_params` / `update_template_params` in `ApplicationController`; routes.
- [ ] B2. `TemplatesController` index, show, create, update, destroy with the team chain, `FeatureGated` per kind, `can_manage`, `paginate`, search, `assign_lock_version` and 409 handling.
- [ ] B3. `test/controllers/templates_controller_test.rb`: listing per kind with search and paging, a query-count test (1 vs 10 templates), another team's template 404, feature off 403, create defaults, `can_manage` for creator / admin / owner / other member (403 on update and delete), lock conflict 409, `LOCK_VERSION_REQUIRED`, invalid board content 422.
- [ ] B4. `BoardsController#create` with `template_id`: copies columns and priorities in one transaction; unknown or other-kind template 404 `TEMPLATE_NOT_FOUND`. Tests in `boards_controller_test.rb` for both paths and that the default path is unchanged.

### C. Frontend data layer
- [ ] C1. `models/template.model.ts`, `config/errorCodes/templates.ts` (exported from `index.ts`), `ERRORS.TEMPLATES.*` in every translation file.
- [ ] C2. `TemplateService` with mappers and `resolve`; `BoardService.createBoard` optional `templateId`. Specs for the mappers, `resolve` (team id, built-in key, unknown key) and the conflict result.
- [ ] C3. `config/builtInTemplates.ts` with the seven built-ins; a spec checking every diagram built-in parses as JSON with cells and every page built-in is non-empty HTML. Load each one in the running editors to check it renders.

### D. Pages and diagrams templates UI
- [ ] D1. `AppRoutes` entries and the template routes in `dashboardRoutes` with `featureGuard`.
- [ ] D2. `ItemTabsComponent` and its use on the Pages, Diagrams and templates screens.
- [ ] D3. `TemplateListComponent`, `PageTemplatesComponent`, `DiagramTemplatesComponent`: search, built-in group, paging, delete confirm, Use template. Specs for search filtering of built-ins and placing a created template.
- [ ] D4. `TemplateDetailBase`, `PageTemplateDetailComponent`, `DiagramTemplateDetailComponent` (create, view, edit, read-only when not `canManage`, built-in read-only with Duplicate, conflict dialog, Esc); any new `ItemDetailLayoutComponent` inputs to hide project, favourite and folder. Specs for the manage rules and Duplicate.
- [ ] D5. `TemplatePickerDialogComponent`; Blank / From template menus on the toolbar buttons and the item tree's folder +; navigation to `…/new?template=…&folder=…`. Specs.
- [ ] D6. `FolderedItemDetailComponent` create mode prefill from `?template=` with the failure path. Specs.
- [ ] D7. `PHRASES` and all 11 translation files for the D block strings.

### E. Board templates UI
- [ ] E1. `BoardTemplatesComponent` (list via `TemplateListComponent`, New template → Blank / From existing board) and the sidebar **Board templates** row (hidden with boards off).
- [ ] E2. `BoardTemplateDetailComponent`: name, column drag list, priority editor, create / save / delete, read-only, conflict dialog, Esc; board picker dialog for From existing board. Specs for building content from a board and from blank defaults.
- [ ] E3. `CreateBoardDialogComponent` with the template select and server search; `SidebarBoardsComponent` uses it and passes `templateId`; handle `TEMPLATE_NOT_FOUND` in the dialog. Update `sidebar-boards.component.spec.ts`.
- [ ] E4. `PHRASES` and all 11 translation files for the E block strings.

### F. Docs and related specs
- [ ] F1. Update the root `CLAUDE.md`: the templates table and endpoints, board create `template_id`, template routes, `TemplateService`, built-ins in `config/builtInTemplates.ts`.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint: `bin/rails test`, `bin/rubocop`, `bin/brakeman` in `backend/`; `npm test`, `npm run build` (style budgets) in `frontend/`.
- [ ] Z2. Manual check in the running app: create a page template, use it from the toolbar and from a folder +, use a built-in, duplicate a built-in, edit as another member (read-only) and as admin; same for diagrams; build a board template from an existing board, create a board from it and check columns and priorities; turn a feature off and check the tab, row and select disappear.
