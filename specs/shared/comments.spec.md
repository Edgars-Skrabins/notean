# Comments — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-28

# Part 1 — Business logic and usage

Team members discuss work where it lives. Tickets and pages get a flat, chronological list of rich-text comments; diagrams get comment pins placed on the canvas, each holding its own flat comment list, shown on hover and opened on click (Figma-style). Comments are plain conversation: they never change the item they belong to.

- **Users:** every team member who can see the item (team membership, the item's feature turned on, and project visibility through `ProjectAccess`). There are no extra roles for commenting.

- **Usage — tickets:**
  1. The ticket popup shows a **Comments** section in the main column, below the description.
  2. It loads the newest 50 comments and shows them oldest first, so the newest sits at the bottom right above the comment box. While older comments exist, a *Load more* button sits at the top of the list and loads the 50 before the oldest one shown.
  3. Each comment shows the author's avatar and nickname, the time relative to now ("5 minutes ago", in the user's language) with the exact date and time in a tooltip, an "(edited)" marker if the text was changed after posting, and the rich-text body.
  4. Below the list is a rich-text editor (the same toolbar as pages: bold, italic, H2, bullet and numbered lists) and a *Comment* button, disabled while the editor is empty or a post is in flight. Posting appends the comment at the bottom and clears the editor.
  5. Empty state: "No comments yet". While loading, the section shows nothing until the first page arrives; a load error shows the translated error in the section.
- **Usage — pages:** the same Comments section, below the page content, in view mode only. It is hidden while editing the page and in create mode.
- **Usage — diagrams:**
  1. In view mode the diagram canvas shows a marker for every unresolved comment pin, at the point on the canvas where it was placed. Markers move and scale with panning and zooming. Pins are hidden while editing the diagram and in create mode.
  2. Hovering a marker shows a small card: the first comment's author, the start of its text, and "N replies" when the pin has more than one comment.
  3. Clicking a marker opens the pin's thread panel next to it: the full comment list (same list, loading and *Load more* rules as tickets), a reply editor with a *Reply* button, and a *Resolve* button (*Reopen* on a resolved pin). Esc or clicking outside closes the panel.
  4. An *Add comment* button over the canvas switches to placement mode (cursor changes); the next click on the canvas opens an empty panel at that point with the editor. Posting creates the pin with its first comment. Esc or *Cancel* leaves placement mode without creating anything.
  5. A *Show resolved* toggle over the canvas also shows resolved pins, drawn faded; their panel offers *Reopen*.
- **Usage — editing and deleting:** a "…" menu on a comment offers *Edit* (author only) and *Delete* (author, team admins and the owner). *Edit* swaps the body for the editor with *Save* and *Cancel*; Esc cancels. *Delete* asks for confirmation with `ConfirmDialogComponent`. Deleting a pin's last comment removes the pin from the canvas.
- **No live updates:** other people's new, edited and deleted comments and pin changes appear when the item is opened again. Actions that fail because the comment or pin is already gone show the translated error and remove it from the view.

- **Rules:**
  - Viewing, posting, resolving and reopening require being an active member of the item's team, the item's feature on (`boards` for tickets, `pages`, `diagrams`), and the item visible to the user (otherwise the item's own 404, e.g. `PAGE_NOT_FOUND`, or 403 `FEATURE_DISABLED`).
  - Only the author edits a comment. The author, team admins and the team owner delete it. Anyone else gets 403 `FORBIDDEN`.
  - Anyone who can see the diagram resolves and reopens any of its pins.
  - Body: sanitised rich-text HTML. It must contain visible text (422 `COMMENT_BODY_REQUIRED`). Its visible text is at most 10,000 characters (`ContentLimits::DESCRIPTION_MAX_LENGTH`) and its HTML at most 50,000 bytes; either breach is 422 `DESCRIPTION_TOO_LONG`.
  - A comment's `edited_at` is set when its body changes; posting sets none.
  - Comments never touch their item: no `updated_at` change, no `lock_version` bump, no edit conflicts.
  - Deleting a pin's last comment deletes the pin.
  - Deleting a ticket, page or diagram deletes its comments and pins (until the trash spec changes item deletion). Deleting a board deletes its tickets' comments through the tickets.
  - A member removed from the team keeps their comments, shown under their last nickname (from `all_memberships`). A deleted account's comments stay, also under the last nickname, with the anonymised avatar.
  - When an item moves to another project, its comments simply follow the item's visibility.

- **Out of scope:**
  - Inline comments anchored to selected page text: a separate spec later.
  - Replies and nested threads on tickets and pages: lists are flat by decision.
  - Comments on boards themselves.
  - Live updates of comments.
  - Comment counts on kanban cards, list rows or item lists.
  - `@` mentions inside comments: the mentions spec.
  - Notifications about comments: the notifications-inbox spec.
  - Deleted comments going to the trash: the trash spec.
  - Files and images attached to comments: the attachments spec.
  - Including comment text in global search.

### Related specs

Being written in parallel; this spec only leaves hooks for them.

- **mentions** (`mentions.spec.md`): adds `@user` / `@item` to comment bodies. Comment bodies are Tiptap HTML sanitised in one place, `CommentBody.sanitize`, so mentions can add a Tiptap mention node and allowlist its tag and attributes there. The comment editor is `RichTextEditorComponent`, where the mention extension and its dropdown will plug in.
- **notifications-inbox**: may notify on new comments. `CommentsController#create` is the single place a comment is created (pin creation included), so a notification hook goes there.
- **trash**: may turn comment and item deletion into soft deletes. Today comments and pins are hard-deleted, and they go with their item through `dependent: :destroy`.
- **attachments**: may attach files to comments by attaching to the `Comment` model.
- **copy-link**: not needed for comments in this spec; linking to a single comment is not part of it.

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. Backend: Rails, `Rails::Html::SafeListSanitizer`, `SearchText.from_html` for visible text. Frontend: the existing `RichTextEditorComponent` (Tiptap), `relativeDate` from `@utils/relativeDate`, `appTooltip`, `ConfirmDialogComponent`, `LoadMoreComponent`, `MenuButtonComponent`, `AvatarComponent`, CDK overlay, and AntV X6 graph events for pin positions.

## 2.2 Structure

### Data model

Edit the single `create_schema` migration and rebuild (project approach), then refresh `db/schema.rb`.

`comments`
| column | type | notes |
|---|---|---|
| `team_id` | integer, not null | index; for team scoping of edit and delete |
| `commentable_type` | string, not null | `Ticket`, `Page` or `DiagramCommentPin` |
| `commentable_id` | integer, not null | |
| `created_by_user_id` | integer, not null | index |
| `body` | text, not null | sanitised HTML |
| `edited_at` | datetime, null | |
| timestamps | | |

Index `[commentable_type, commentable_id, id]` for the per-item list.

`diagram_comment_pins`
| column | type | notes |
|---|---|---|
| `team_id` | integer, not null | index |
| `diagram_id` | integer, not null | index |
| `created_by_user_id` | integer, not null | |
| `x`, `y` | float, not null | X6 graph (local) coordinates |
| `resolved_at` | datetime, null | |
| `resolved_by_user_id` | integer, null | |
| timestamps | | |

Models:
- `Comment` (`include ContentLimits`): `belongs_to :team`, `belongs_to :commentable, polymorphic: true`, `belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id`. `COMMENTABLE_TYPES = %w[Ticket Page DiagramCommentPin]` with an inclusion validation; a validation that `commentable.team_id == team_id`; `body_text_present` (`errors.add(:body, :blank)`) and `body_size` (`errors.add(:body, :too_long)` when `SearchText.from_html(body).length > DESCRIPTION_MAX_LENGTH` or `body.bytesize > BODY_MAX_BYTES`, `BODY_MAX_BYTES = 50_000`). `before_update { self.edited_at = Time.current if body_changed? }`.
- `DiagramCommentPin`: `belongs_to :team`, `belongs_to :diagram`, `belongs_to :creator`, `belongs_to :resolver, class_name: "User", foreign_key: :resolved_by_user_id, optional: true`, `has_many :comments, as: :commentable, dependent: :destroy`. `x` and `y` numeric validations.
- `Ticket` and `Page`: `has_many :comments, as: :commentable, dependent: :destroy`. `Diagram`: `has_many :comment_pins, class_name: "DiagramCommentPin", dependent: :destroy`.
- `CommentBody` (plain Ruby class in `app/models/`): `self.sanitize(html)` wraps `Rails::Html::SafeListSanitizer.new.sanitize(html.to_s)`. All comment writes go through it.
- `limit_error_code` in `ApplicationController` also returns `DESCRIPTION_TOO_LONG` for `errors.of_kind?(:body, :too_long)`.

### API

All under `teams/:team_code`, JSON keys snake_case, errors via `render_error`.

| Method and path | Action |
|---|---|
| `GET boards/:board_id/tickets/:ticket_id/comments` | list a ticket's comments |
| `POST boards/:board_id/tickets/:ticket_id/comments` | `{ comment: { body } }` → 201 `{ comment }` |
| `GET pages/:page_id/comments` | list a page's comments |
| `POST pages/:page_id/comments` | as above |
| `GET diagrams/:diagram_id/comment_pins` | every pin of the diagram → `{ comment_pins: [...] }` |
| `POST diagrams/:diagram_id/comment_pins` | `{ comment_pin: { x, y, body } }` → 201 `{ comment_pin, comment }` (pin and first comment in one transaction) |
| `PATCH comment_pins/:id` | `{ comment_pin: { resolved } }` → `{ comment_pin }` |
| `GET comment_pins/:comment_pin_id/comments` | list a pin's comments |
| `POST comment_pins/:comment_pin_id/comments` | reply → 201 `{ comment }` |
| `PATCH comments/:id` | `{ comment: { body } }` → `{ comment }`, author only |
| `DELETE comments/:id` | 204, author or admin/owner; also deletes an emptied pin and then responds `{ comment_pin_deleted: true }` with 200 |

List endpoints: newest first by `id`, 50 per page (`PAGE_SIZE`), cursor `before_id` (only comments with a smaller id), responding `{ comments: [...], has_more }`. The client reverses each page to show oldest first.

JSON:
- `comment`: `{ id, body, created_at, edited_at, author: member_json(creator) }`.
- `comment_pin`: `{ id, x, y, resolved_at, resolved_by: member_json or null, created_by: member_json, comment_count, first_comment: comment }`.

Controllers (`include FeatureGated`, the usual `authenticate_user!` → `set_team` → `authorize_team_member!` chain):
- `CommentsController`: `index` and `create` find the commentable from whichever parent param is present, each with its own feature check and visibility scope: `ticket_id` (boards on, `set_board` from `BoardScoped`, ticket in `@board.tickets`, else `TICKET_NOT_FOUND`), `page_id` (pages on, `project_access.scope(@team.pages)`, else `PAGE_NOT_FOUND`), `comment_pin_id` (diagrams on, pin whose diagram is in `project_access.scope(@team.diagrams)`, else `COMMENT_PIN_NOT_FOUND`). `update` and `destroy` find the comment in `Comment.where(team: @team)`, then check its commentable the same way (feature off → 403 `FEATURE_DISABLED`, hidden item → 404 `COMMENT_NOT_FOUND`).
- `DiagramCommentPinsController`: `index`, `create`, `update`, with `require_feature!(:diagrams)` and the diagram (or pin's diagram) scoped through `project_access`.
- Strong params `create_comment_params`, `update_comment_params`, `create_comment_pin_params`, `update_comment_pin_params` in `ApplicationController`.
- Shared `comment_json` lives in a `CommentJson` concern used by both controllers. Lists preload `creator: User::AVATAR_PRELOAD`; the pin index preloads creators, resolvers and first comments with their creators and counts comments in one grouped query, so its query count does not grow with pins.

Error codes, new module `ErrorCodes::Comments` (`app/errors/error_codes/comments.rb`) and frontend `config/errorCodes/comments.ts`: `COMMENT_NOT_FOUND`, `COMMENT_PIN_NOT_FOUND`, `COMMENT_BODY_REQUIRED`, `COMMENT_CREATE_FAILED`, `COMMENT_UPDATE_FAILED`, `COMMENT_PIN_UPDATE_FAILED`. Reused: `FORBIDDEN`, `DESCRIPTION_TOO_LONG`, `FEATURE_DISABLED`, `TICKET_NOT_FOUND`, `PAGE_NOT_FOUND`, `DIAGRAM_NOT_FOUND`, `BOARD_NOT_FOUND`.

`MembershipRemoval` and `User#anonymise!` are unchanged: comments stay and `member_json` resolves nicknames through `team_nicknames` (all memberships).

### Frontend

- `models/comment.model.ts`: `Comment { id, body, createdAt, editedAt, author: Member-shaped }`, `CommentPin { id, x, y, resolvedAt, resolvedBy, createdBy, commentCount, firstComment }`, `CommentTarget` union: `{ type: 'ticket', boardId, ticketId } | { type: 'page', pageId } | { type: 'commentPin', pinId }`, plus `Result` response types.
- `services/comment.service.ts` (`providedIn: 'root'`, `axiosInstance`, `apiRequest`, `teamPath`, `mapComment` / `mapCommentPin`): `list(target, beforeId?)`, `create(target, body)`, `update(id, body)`, `delete(id)`, `listPins(diagramId)`, `createPin(diagramId, x, y, body)`, `setPinResolved(pinId, resolved)`.
- `components/comment-list/` (`app-comment-list`): input `target: CommentTarget`, loads and pages the list, renders `app-comment-item` rows, *Load more* at the top, the new-comment editor and button (`submitLabel` input: Comment / Reply). Outputs `countChange` (for the pin card) and `emptied` (last comment of a pin deleted).
- `components/comment-item/` (`app-comment-item`): avatar, nickname, relative time with `appTooltip` exact time, "(edited)", body via `[innerHTML]`, "…" `app-menu-button` with Edit / Delete according to the current user id and `TeamService` role, inline edit with `RichTextEditorComponent`, delete via `ConfirmDialogComponent`. Esc in edit calls `event.preventDefault()` so the popup's `EscapeService` layer doesn't close.
- `components/diagram-comment-layer/` (`app-diagram-comment-layer`): sits over the read-only flowchart in diagram view mode. Inputs: `diagramId`, a `toCanvasPoint(x, y)` mapping and viewport-change notifications from the editor. Draws markers, the hover card, the *Add comment* button, the *Show resolved* toggle and the thread panel (a CDK overlay containing `app-comment-list` for the pin and the *Resolve* / *Reopen* button). Pushes an `EscapeService` layer while placing or while a panel is open.
- `FlowchartEditorComponent` gains: an `@Output() viewportChange` emitted on X6 `translate`, `scale` and `resize`; an `@Output() blankClick` with graph-local coordinates (`graph.clientToLocal`); a public `localToCanvas(x, y)` (`graph.localToGraph`). Nothing else in the editor changes and pins never enter diagram content.
- `TicketDetailComponent` template: `<app-comment-list>` below the description textarea. `PageDetailComponent` template: `<app-comment-list>` after `.pageDetail__content` in view mode. `DiagramDetailComponent`: `app-diagram-comment-layer` wired to the view-mode editor.
- Phrases (in `PHRASES` and all 11 translation files): `COMMENTS`, `NO_COMMENTS_YET`, `COMMENT_PLACEHOLDER`, `POST_COMMENT`, `REPLY`, `COMMENT_EDITED`, `EDIT_COMMENT`, `DELETE_COMMENT`, `CONFIRM_DELETE_COMMENT`, `ADD_COMMENT`, `SHOW_RESOLVED`, `RESOLVE`, `REOPEN`, `COMMENT_REPLIES` (with `{{count}}`), `COMMENT_ACTIONS`, and `ERRORS.COMMENTS.*` for each new code.

## 2.3 Decisions

All recorded 2026-10-28.

1. **Which items get comments?** Tickets, pages and diagrams. Boards: no.
2. **Structure?** Flat chronological lists. One-level and nested replies rejected as unneeded complexity.
3. **Edit and delete?** Author edits; author, admins and owner delete. "(edited)" marker. Author-only and immutable comments rejected.
4. **Inline page comments anchored to text?** Not in this spec; a later spec.
5. **Diagram comments?** Pins at a canvas point (graph coordinates), stored outside diagram content so they never cause edit conflicts. Attaching to shapes rejected (orphan handling when shapes are deleted).
6. **What is a pin?** A flat thread: a pin holds a list of comments. One-comment-per-pin rejected (replies scatter).
7. **Pin visibility by mode?** View mode only; hidden in edit and create.
8. **Resolve?** Diagram pins only; anyone who can see the diagram resolves and reopens; resolved pins hidden unless *Show resolved*.
9. **Body format?** Rich text the same way as pages: Tiptap HTML sanitised with `SafeListSanitizer`, edited with `RichTextEditorComponent` and its full page toolbar. Plain text and Markdown rejected.
10. **Live updates?** None. Comments refresh when the item reopens. A dedicated channel and BoardChannel reuse were rejected.
11. **Order and loading?** Oldest first on screen, newest 50 loaded first, *Load more* at the top for older ones.
12. **Paging?** Cursor `before_id`, not the project's `offset`, so posting and deleting never shift pages. A deliberate exception to the offset convention.
13. **Length limit?** 10,000 characters of visible text (`DESCRIPTION_MAX_LENGTH`), plus 50,000 bytes of HTML; both errors are `DESCRIPTION_TOO_LONG`. Counting raw HTML rejected (formatting would eat the limit).
14. **Page comment placement?** Section under the content, view mode only.
15. **Naming?** "Comment pin": `DiagramCommentPin`, `diagram_comment_pins`. "Thread" and "marker" rejected.
16. **Emptied pin?** Deleting a pin's last comment deletes the pin; no separate pin delete action.
17. **Comment counts on cards or rows?** Not in this spec.
18. **Does commenting touch the item?** No: no `updated_at` or `lock_version` change.
19. **API shape?** Nested under each item for list and create, flat `comments/:id` for edit and delete, flat `comment_pins/:id` for resolve. A single flat `comments?commentable_type=` resource rejected (access checks switching on type).
20. **Timestamps?** Relative in the user's language via `relativeDate`, exact time in a tooltip. Absolute dates rejected.
21. **Edit and delete UI?** "…" menu, inline edit with Save/Cancel (Esc cancels), delete with confirmation.
22. **Pin hover?** First comment's author and the start of its text plus "N replies"; click opens the full thread.
23. **Pin loading?** All pins of a diagram, resolved included, in one request; a pin's thread loads 50 at a time on open.
24. **Removed members and deleted accounts?** Comments stay under the last nickname (follows the project's existing content rule, not a new decision).
25. **Item deletion?** Comments and pins are hard-deleted with their item; the trash spec may change that.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: record the counts of `bin/rails test` (backend) and `npm test` (frontend) on the fresh branch here before the first change.

### A. Data model
- [ ] A1. Add the `comments` and `diagram_comment_pins` tables with their indexes to `backend/db/migrate/20261026120000_create_schema.rb`, rebuild the dev and test databases, and refresh `backend/db/schema.rb` (keep only this branch's tables in it).
- [ ] A2. Add `CommentBody` (`app/models/comment_body.rb`) and the `Comment` model with its validations and `edited_at` callback. Model tests in `test/models/comment_test.rb`: empty and tag-only bodies are invalid, 10,000 visible characters pass and 10,001 fail, HTML over 50,000 bytes fails, a commentable from another team fails, editing the body sets `edited_at` and creating does not.
- [ ] A3. Add `DiagramCommentPin` and the `has_many` associations on `Ticket`, `Page` and `Diagram`. Model tests: deleting a ticket, page or diagram deletes its comments and pins; posting a comment leaves the item's `updated_at` and `lock_version` unchanged.
- [ ] A4. Add fixtures for a few comments and pins if the controller tests need shared data.

### B. API
- [ ] B1. Add `ErrorCodes::Comments`, the four strong-param methods, and the `:body` case in `limit_error_code`.
- [ ] B2. Add routes (comments nested under tickets and pages; comment_pins under diagrams; `comment_pins` with nested comments, and `comments` under teams) and the `CommentJson` concern.
- [ ] B3. `CommentsController#index` and `#create` for tickets, pages and pins, with `before_id` paging. Tests in `test/controllers/comments_controller_test.rb`: order and `has_more` with `before_id`, posting sanitises script tags, `COMMENT_BODY_REQUIRED`, `DESCRIPTION_TOO_LONG`, feature off is 403 `FEATURE_DISABLED`, a hidden project item is 404, a non-member is rejected, a removed member's comment shows their last nickname, query count with 1 and 10 comments is equal.
- [ ] B4. `CommentsController#update` and `#destroy`. Tests: only the author edits (others 403 `FORBIDDEN`, admins included); author, admin and owner delete, a plain member deleting someone else's gets 403; deleting a pin's last comment deletes the pin and responds `comment_pin_deleted: true`; a comment on a now-hidden item is 404 `COMMENT_NOT_FOUND`.
- [ ] B5. `DiagramCommentPinsController` index, create and update. Tests: create makes pin and first comment together and rolls back both on an invalid body; any member who can see the diagram resolves and reopens, setting and clearing `resolved_at` / `resolved_by`; index includes resolved pins with `comment_count` and `first_comment`; query count with 1 and 10 pins is equal.
- [ ] B6. Run `bin/rails test`, `bin/rubocop` and `bin/brakeman`.

### C. Frontend data layer
- [ ] C1. Add `config/errorCodes/comments.ts`, register it in `config/errorCodes/index.ts`, and add `ERRORS.COMMENTS.*` to every translation file.
- [ ] C2. Add `models/comment.model.ts` and `services/comment.service.ts` with the mappers. `comment.service.spec.ts`: URLs per target type (`teamPath`), `before_id` passed through, snake_case mapping, error codes returned as `Result`.

### D. Shared comment components
- [ ] D1. Add the phrases to `config/phrases.ts` and all 11 translation files.
- [ ] D2. Create `app-comment-item` (`npm run newcomponent comment-item`) with author, relative time and exact-time tooltip, "(edited)", body, the "…" menu by permission, inline edit (Esc cancels with `preventDefault`) and delete confirmation. Spec: menu entries for author, admin and plain member; save sends the body and shows the result; cancel restores.
- [ ] D3. Create `app-comment-list` with newest-50 loading shown oldest first, *Load more* at the top with `before_id`, empty and error states, the editor and submit button (disabled when empty or busy), appending own posts, `countChange` and `emptied`. Spec: page reversal and prepending older pages, posting clears the editor, deleting the last comment emits `emptied`.
- [ ] D4. Keep each component's CSS under the 2kB budget, using tokens only and the shared `.popupPanel` / `.capsLabel` classes.

### E. Tickets and pages
- [ ] E1. Add `<app-comment-list>` under the description in `ticket-detail.component.html`; check the popup still scrolls as one body.
- [ ] E2. Add `<app-comment-list>` under the content in view mode in `page-detail.component.html`.

### F. Diagram pins
- [ ] F1. Add `viewportChange`, `blankClick` and `localToCanvas` to `FlowchartEditorComponent`; extend its spec for the coordinate mapping and the outputs.
- [ ] F2. Create `app-diagram-comment-layer`: load pins, draw markers positioned through `localToCanvas` and re-placed on `viewportChange`, hide resolved unless *Show resolved*, hover card with author, text start and reply count.
- [ ] F3. In the layer: the thread panel (CDK overlay with `app-comment-list` for the pin, *Resolve* / *Reopen*), *Add comment* placement mode via `blankClick` creating the pin with its first comment, removing a pin on `emptied`, and the `EscapeService` layers. Spec: placement creates a pin at the clicked graph point, resolve hides the marker, Esc leaves placement mode.
- [ ] F4. Wire the layer into `diagram-detail.component.html` for view mode only.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`bin/rails test`, `bin/rubocop`, `bin/brakeman`, `npm test`, `npm run build` within budgets).
- [ ] Z2. Update the root `CLAUDE.md`: the comments routes and `before_id` paging exception, the `Comment` / `DiagramCommentPin` models and `CommentBody`, and the comment components and `CommentService`.
- [ ] Z3. Manual check in the running app: comment on a ticket and a page, load more on a long list, edit and delete as author, delete as admin, then place a pin on a diagram, reply, resolve, show resolved, reopen, and delete the pin's only comment; confirm none of it changes the item's edit state or causes an edit conflict.
