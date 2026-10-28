# Ticket tags — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-28

# Part 1 — Business logic and usage

Jira-style labels for tickets. Each board has its own list of tags: small coloured chips with a short name, such as "frontend", "bug" or "customer". A ticket can carry any number of its board's tags, they show on Kanban cards, List rows and in the ticket popup, and the List tab can filter tickets by tag.

- **Users:** every team member who can see the board (the same people who can edit its tickets and priorities today).

- **Usage — tagging a ticket (ticket popup):**
  1. Below Priority, a **Tags** field shows the ticket's tags as chips, sorted by name, and a **+** button (`app-icon-button`, tooltip "Add tag"). With no tags it shows only the button.
  2. **+** opens a dropdown panel (`.popupPanel`) with a search field and the board's tags sorted by name, each a checkbox row with its chip. Checking adds the tag to the ticket, unchecking removes it, and the panel stays open.
  3. When the search text matches no tag name exactly (ignoring case) and is 1–24 characters after trimming, the last row is **Create tag "…"**. It creates the tag with the next colour in the preset order (the colour least used on the board, first in order on a tie) and adds it to the ticket.
  4. Each chip in the field has a small × (tooltip "Remove tag") that removes the tag from the ticket.
  5. Esc or a click outside closes the panel; Esc only closes the panel, not the popup.
  6. Errors (name taken, network) show the translated error in a toast.

- **Usage — managing tags (Overview tab):**
  1. The board's Overview tab gets a **Tags** section next to Priorities (`TagListComponent`): every tag as a chip with its ticket count, sorted by name.
  2. **New tag** adds a row with a name field (max 24) and the colour picker; Enter or blur saves.
  3. Each row can be renamed inline, recoloured with the colour picker, and deleted. Delete asks for confirmation ("Remove this tag from N tickets?" when N > 0) and removes the tag from every ticket.
  4. Empty state: "No tags yet".

- **Usage — seeing tags:**
  - Kanban cards show the ticket's tags as chips under the title: up to 3, then a "+N" chip with a tooltip listing the rest.
  - List rows show up to 2 tags, then "+N".
  - Tag chips have the tag colour as background and the theme's text colour, so they read in every theme and mode.

- **Usage — filtering (List tab):**
  1. `TicketFilterComponent` gets a **Tags** section under Assignees: a checkbox per board tag (chip plus name) and **No tags**. Its active count includes checked tags.
  2. A ticket matches when it has **any** of the checked tags (or no tags at all, when No tags is checked), combined with the other filters (search, assignees, columns) as today: all filters must match.
  3. Like the assignee filter, a tag filter makes the List tab stop inserting other tickets live, and a tag change on a loaded ticket that makes it stop matching removes it from the list.

- **Rules:**
  - A tag belongs to one board. Names are 1–24 characters after trimming, unique per board ignoring case (409 `TAG_NAME_TAKEN`).
  - Colours come from a fixed preset list, the same eight as priorities: grey, blue, teal, green, yellow, orange, red, purple.
  - A board has at most 100 tags (422 `TAG_LIMIT_REACHED`) and a ticket at most 10 tags (422 `TICKET_TAG_LIMIT_REACHED`).
  - A ticket can only carry tags of its own board (404 `TAG_NOT_FOUND` otherwise).
  - Adding or removing a tag on a ticket refreshes the ticket's `updated_at` but never its `lock_version`, like assignee changes.
  - Deleting a tag removes it from every ticket. Deleting a board deletes its tags.
  - Tag changes reach everyone with the board open, live.
  - New boards start with no tags.

- **Out of scope:**
  - Team-wide tags shared across boards: the user asked for board-scoped tags.
  - Bulk add or remove tag in the List tab selection bar: a later spec.
  - Filtering the Kanban tab: it has no filters today.
  - Tags in global search, My Work or the notifications inbox.
  - Manual ordering of tags: always sorted by name.

### Related specs

- **templates** (`templates.spec.md`): board templates copy columns and priorities. Once both specs are merged, they also copy tags (without ticket links). Whichever spec is merged second wires this.
- **trash** (`trash.spec.md`): trashed tickets keep their tag links and get them back on restore. Deleting a tag removes its links from trashed tickets too (database cascade).
- **notifications-inbox**: tag changes are not an "item changed" event.

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. Backend: ActiveRecord, `BoardBroadcast`. Frontend: Angular CDK overlay, `CheckboxComponent`, `PriorityColorPickerComponent`, `ConfirmDialogComponent`, `EscapeService`, ngx-translate.

## 2.2 Structure

### Data model (edit the single `create_schema` migration and rebuild)

- `board_tags`: `board_id` (FK, not null), `name` (string, not null), `color` (string, not null), timestamps. Unique index on `board_id, LOWER(name)`.
- `ticket_tags`: `ticket_id` (FK, `on_delete: :cascade`), `board_tag_id` (FK, `on_delete: :cascade`), `created_at`. Unique index on `ticket_id, board_tag_id`, plus an index on `board_tag_id`.

### Models

- `BoardTag` (`app/models/board_tag.rb`): `NAME_MAX_LENGTH = 24`, `MAX_PER_BOARD = 100`, `COLORS = BoardPriority::COLORS`, `belongs_to :board`, `has_many :ticket_tags, dependent: :delete_all`, `has_many :tickets, through: :ticket_tags`. Validates the name (presence, length, uniqueness per board ignoring case; the name is stripped before validation), `color` in `COLORS`, and the per-board limit on create. `BoardTag.next_color(board)` returns the least used colour, first in `COLORS` order on a tie.
- `TicketTag` (`app/models/ticket_tag.rb`): `belongs_to :ticket`, `belongs_to :tag, class_name: "BoardTag", foreign_key: :board_tag_id`. Validates that the tag belongs to the ticket's board and the 10-tag limit (`Ticket::MAX_TAGS = 10`). `after_create_commit` / `after_destroy_commit` call `Ticket.refresh_updated_at`, like `TicketAssignee`.
- `Board`: `has_many :tags, -> { order(Arel.sql("LOWER(name)")) }, class_name: "BoardTag", dependent: :delete_all`.
- `Ticket`: `has_many :ticket_tags, dependent: :delete_all`, `has_many :tags, through: :ticket_tags`.

### API (under `teams/:team_code/boards/:board_id`, controllers include `BoardScoped`, `FeatureGated` with `require_feature!(:boards)`)

| Route | Controller#action | Response |
|---|---|---|
| `POST tags` `{ tag: { name, color } }` (`color` optional, defaults to `BoardTag.next_color`) | `TagsController#create` | 201 `{ tag }`; broadcasts `tags_changed` |
| `PATCH tags/:id` `{ tag: { name?, color? } }` | `TagsController#update` | `{ tags }`; broadcasts `tags_changed` |
| `DELETE tags/:id` | `TagsController#destroy` | `{ tags }`; broadcasts `tags_changed` with the cleared tickets |
| `POST tickets/:ticket_id/tags` `{ tag: { tag_id } }` | `TicketTagsController#create` | 201 (or 200 if already tagged) `{ ticket }`; broadcasts `tickets_upserted` |
| `DELETE tickets/:ticket_id/tags/:tag_id` | `TicketTagsController#destroy` | `{ ticket }`; broadcasts `tickets_upserted` |

- `TagJson` concern (`tags_json(board)` with one grouped count query for `ticket_count`, `tag_json(tag, count)`: `id, name, color, ticket_count`), modelled on `PriorityJson`.
- Board JSON (`BoardsController` show and update) gains `tags`, preloaded.
- `ticket_json` and `ticket_summary_json` gain `tag_ids` (sorted by tag name). Every endpoint that renders tickets preloads `ticket_tags: :tag` (add it next to `TicketJson::ASSIGNEES_PRELOAD`) so query-count tests stay flat.
- `TicketsController#index` takes `tag_ids[]` (ids or `none`), filtered by a `tag_filtered` method next to `assignee_filtered`, with the same any-of and `none` semantics.
- `BoardBroadcast.tags_changed(board, tags, tickets: nil)` sends `{ type: "tags_changed", tags, tickets }`.
- Error codes: new `ErrorCodes::Tags` (`app/errors/error_codes/tags.rb`): `TAG_NOT_FOUND`, `TAG_NAME_TAKEN`, `TAG_SAVE_FAILED`, `TAG_LIMIT_REACHED`, `TICKET_TAG_LIMIT_REACHED`. Mirrored in `config/errorCodes/tags.ts` and `ERRORS.TAGS.*` in every translation file.
- Strong params in `ApplicationController`: `create_tag_params`, `update_tag_params`, `create_ticket_tag_params`.

### Frontend

- `models/tag.model.ts`: `Tag { id, name, color: PriorityColor, ticketCount }`, `TAG_NAME_MAX_LENGTH = 24`, and the result types. `Board` gains `tags: Tag[]`; `Ticket` gains `tagIds: number[]`; `TicketFilters` gains `tagIds: Set<number | 'none'>`.
- `services/tag.service.ts` (`TagService`, root): `create`, `update`, `remove`, `addToTicket`, `removeFromTicket`, `mapTag`, through `apiRequest` and `teamPath`. `TicketService.list` sends `tag_ids`. `mapTicket` maps `tag_ids`; the board mapper maps `tags`.
- `BoardPageStateService`: `setTags(tags)`, `tagById(id)`, and applying ticket responses from tag changes through the existing ticket update path (so `ticketChanges$` fires). `BoardChannelService` handles `tags_changed` (`setTags` plus `applyTickets` for cleared tickets).
- `components/tag-chip/` (`app-tag-chip`): `@Input() tag`, `@Input() removable`, `@Output() remove`. Background from the shared colour tokens via `[attr.data-color]` and a `.tagChip` rule in `styles.css` next to `.priorityDot`, with `color-mix` to keep the chip tinted and readable in light and dark modes.
- `components/ticket-tags/` (`app-ticket-tags`): the popup's Tags field and panel (search, checkbox rows, Create tag row), pushing an Esc layer on `EscapeService` while the panel is open.
- `components/tag-list/` (`app-tag-list`): the Overview tab's Tags section, modelled on `PriorityListComponent` and reusing `PriorityColorPickerComponent`.
- `KanbanTicketComponent` and `ListRowComponent`: tag chips with the "+N" overflow.
- `TicketFilterComponent`: Tags section and `activeCount`; `ListTabComponent` passes the board's tags and includes `tagIds` in the request and in its "insert live only without search or assignee filter" rule.
- `PHRASES` and every translation file: `TAGS`, `ADD_TAG`, `REMOVE_TAG`, `NEW_TAG`, `CREATE_TAG` (with `{{name}}`), `NO_TAGS`, `NO_TAGS_YET`, `SEARCH_TAGS`, `CONFIRM_DELETE_TAG` (with `{{count}}`), `TAG_MORE` ("+{{count}}"), plus `ERRORS.TAGS.*`.

## 2.3 Decisions

All decided by the coordinating session on 2026-10-28 under the user's delegation ("full autonomy").

1. **Scope:** board-scoped, as the user asked. Rejected: team-wide tags.
2. **Name length:** 1–24 characters after trimming, unique per board ignoring case, as the user asked for the length.
3. **Colours:** the same eight preset colours as priorities, reusing `BoardPriority::COLORS`, the `--priority-*` tokens and `PriorityColorPickerComponent`. Rejected: a second palette (more tokens per theme for no gain).
4. **Chip look:** the colour is the chip background, tinted with `color-mix` and the theme text colour, so it reads in all themes. Rejected: a coloured dot like priorities (the user asked for the background to change).
5. **Creating tags:** inline from the ticket popup ("Create tag …") and from the Overview tab. A tag created inline gets the least used colour. Rejected: Overview-only creation (slow, unlike Jira).
6. **Permissions:** any board member, the same as priorities and assignees. Rejected: admins only.
7. **Filter semantics:** any of the checked tags, plus a "No tags" option, combined with the other filters, like the assignee filter. Rejected: all-of matching (unusual for label filters and harder to explain).
8. **Where the filter lives:** the List tab's existing filter. The Kanban tab has no filter UI today, and adding one is out of scope.
9. **Limits:** 100 tags per board, 10 per ticket, to keep chips and queries bounded.
10. **Lock version:** tag changes refresh `updated_at` and never bump `lock_version`, like assignees.
11. **Ordering:** by name everywhere. Rejected: manual positions (no need for labels).
12. **Endpoints:** separate `tickets/:id/tags` add and remove endpoints, like assignees. Rejected: `tag_ids` on ticket update (it would go through the lock-version check and conflict with concurrent edits).
13. **Bulk tag actions:** out of scope for now.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: record the current `bin/rails test` and `npm test` counts here.

### A. Data model
- [ ] A1. Add `board_tags` and `ticket_tags` to the `create_schema` migration and rebuild the dev and test databases; check `db/schema.rb` holds only this change.
- [ ] A2. Add `BoardTag` and `TicketTag` with validations, `next_color`, the limits and the `updated_at` refresh; associations on `Board` and `Ticket`; fixtures. Model tests: name length and case-insensitive uniqueness per board (the same name on another board is fine), colour inclusion, both limits, a tag from another board rejected, `next_color`, `updated_at` refreshed without a `lock_version` change.

### B. API
- [ ] B1. `ErrorCodes::Tags`, strong params, routes, `TagJson` and `BoardBroadcast.tags_changed`.
- [ ] B2. `TagsController` create, update, destroy with broadcasts. Tests: default colour, name taken, limit, delete clears tickets and broadcasts them, hidden board 404, boards disabled 403.
- [ ] B3. `TicketTagsController` create and destroy with `tickets_upserted`. Tests: add, repeated add returns 200, other board's tag 404, ticket limit, remove, `lock_version` unchanged.
- [ ] B4. `tag_ids` in ticket JSON and `tags` in board JSON with preloads; extend the existing query-count tests (board show, tickets index) with tagged tickets.
- [ ] B5. `tag_ids[]` filter on `TicketsController#index`. Tests: any-of, `none`, combined with `assignee_ids`.

### C. Frontend data layer
- [ ] C1. `tag.model.ts`, `config/errorCodes/tags.ts` (exported from `index.ts`), model fields on `Board`, `Ticket` and `TicketFilters`, mappers, `TagService`, `TicketService.list` `tag_ids`. Specs for the mapping and the request params.
- [ ] C2. `BoardPageStateService.setTags` / `tagById` and `BoardChannelService` `tags_changed`; specs.

### D. UI
- [ ] D1. `app-tag-chip` and the `.tagChip` styles.
- [ ] D2. `app-ticket-tags` in the ticket popup: add, remove, search, Create tag, Esc handling. Spec for create-row visibility (no exact match, length limit) and add or remove calls.
- [ ] D3. `app-tag-list` in the Overview tab: create, rename, recolour, delete with confirmation.
- [ ] D4. Chips with "+N" overflow on `KanbanTicketComponent` and `ListRowComponent`.
- [ ] D5. Tags section in `TicketFilterComponent` and `ListTabComponent` wiring. Update their specs (active count, emitted filters, request params, live insert rule).
- [ ] D6. `PHRASES` and all translation files, including `ERRORS.TAGS.*`.

### Z. Wrap-up
- [ ] Z1. Full test runs, build (style budgets) and lint, using the commands in `CLAUDE.md`.
- [ ] Z2. Update the root `CLAUDE.md` (tags model, routes, `tags_changed`, `tag_ids` filter, frontend components).
- [ ] Z3. Manual check in the running app with two browsers: create tags inline and in Overview, tag tickets and see chips live on the other browser's Kanban, filter the List tab by a tag and by No tags, rename and recolour a tag, delete it, and check chips in light and dark mode.
