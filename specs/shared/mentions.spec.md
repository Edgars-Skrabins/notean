# Mentions — Spec

**Type:** feature
**Status:** in progress
**Last updated:** 2026-10-28

# Part 1 — Business logic and usage

Team members link people and work items inline by typing `@`. A small dropdown under the caret offers the 8 nearest matches for the text after `@`; picking one inserts a **mention chip** showing the person's nickname or the item's current title. Item chips open the item. Mentions are stored by id, so renames never break them, and people who can't see a mentioned item never learn its title. Mentioning a person tells them through the notifications inbox.

- **Users:** every team member writing in a field that supports mentions. Readers of that field see the chips.

- **What can be mentioned:** team members (by their team nickname), tickets, pages, diagrams, boards and projects of the active team.

- **Where mentions work:**
  - Comment bodies on tickets, pages and diagram comment pins (comments spec).
  - Page content (the Tiptap page editor).
  - Ticket descriptions (ticket popup).
  - Project descriptions (project form: create dialog and project settings).

- **Usage — writing:**
  1. The writer types `@` at the start of a line or after a space (or opening bracket). The dropdown opens under the caret.
  2. With nothing after `@`, it lists the first 8 active team members by nickname.
  3. Typing narrows it (debounced 300 ms, searched on the server). Results are one flat list of at most 8, each row with a type icon (avatar for people) and the name; item rows also show their board or project name in muted text. People come first, then items.
  4. ↑/↓ move the highlight, Enter or Tab or a click inserts the highlighted result as a chip followed by a space, Esc closes the dropdown (and only the dropdown: the popup or dialog stays open), and typing a space with no results, moving the caret away or deleting the `@` closes it.
  5. No matches: the dropdown shows "No matches". While a request runs the previous results stay, with a loading state only on the first request.
  6. A chip behaves as one character: Backspace removes it whole.

- **Usage — reading:**
  - A person chip shows `@nickname` with the person's avatar colour; it is not clickable and has a tooltip with the nickname. A member who has since left the team shows their last nickname, muted.
  - An item chip shows a type icon and the item's **current** title and opens the item on click (pages, diagrams, boards, projects on their detail routes; tickets in their board's Kanban or List popup).
  - An item the reader can't see (no project access, its feature turned off, or another team) shows a muted, non-clickable **🔒 Private item** chip. An item that no longer exists shows **Deleted item**. Neither reveals the title.
  - In the Projects list, where a description is one line of text, mentions show as plain text with no chips and no extra request: people as `@nickname`, items as `@` plus their translated type ("@Ticket"). Item titles are never stored (decision 19).
  - Chips in the page editor, ticket popup and project form show and behave the same as in read views (a click on an item chip opens it).

- **Usage — notifications:** when a save adds a mention of a person who wasn't mentioned in that text before, that person gets a "mentioned you" entry in their inbox (delivered by the notifications-inbox spec). Never for mentioning yourself, never twice for a mention that was already there, and never to people who can't see the item the text belongs to (a private project ticket, a page in a project they're not on, a disabled feature).

- **Rules:**
  - The dropdown only offers what the writer can see: active members of the team, and items that pass team membership, the type's feature flag and `ProjectAccess`. Types whose feature is off are left out.
  - Ranking: people first (nickname starting with the query before nickname containing it, then alphabetical), then items (title starting with the query before title containing it, then items from the field's own board, then its own project, then the rest, then most recently updated). Only titles, names and nicknames are matched, not content.
  - Access is checked when a chip is shown, for the reader, every time. A forged mention of an item the reader can't see just shows the locked chip.
  - Mentions count towards the field's existing size limit as stored (see 2.2).
  - Feature turned off later: existing chips of that type show 🔒 Private item; nothing is deleted.

- **Out of scope:**
  - Backlinks ("mentioned in" lists on an item) and a mentions table. Can be added later from the tokens.
  - Mentions in ticket or item titles, folder names, diagram shape labels and board column names.
  - Live title updates of chips already on screen (they refresh on the next load).
  - A profile screen for person chips.
  - Chat: the chat spec reuses the picker and chips but wires its own fields.

# Part 2 — Technical details

## 2.1 Tools and libraries

- New frontend dependencies: `@tiptap/extension-mention` and `@tiptap/suggestion`, both at `^3.32.0` to match the existing Tiptap packages. The extension gives the mention node; suggestion handles the `@` trigger, the query text and the dropdown keys. The dropdown itself is our own Angular component in a CDK overlay.
- Otherwise existing stack: Tiptap 3, Angular CDK overlay, `axiosInstance` / `apiRequest`, `TextSearchable`-style `LIKE` matching, `ProjectAccess`, `Rails::Html::SafeListSanitizer`, `SearchText`.
- No backend dependencies.

## 2.2 Structure

### Storage formats

Mention types: `user`, `ticket`, `page`, `diagram`, `board`, `project`.

- **Rich text** (page content, comment bodies): the Tiptap mention node renders and parses
  `<span data-type="mention" data-mention-type="ticket" data-id="123" data-label="Login bug">@Login bug</span>`.
  For `user` mentions the label and the inner text are the nickname at save time. Item mentions (`ticket`, `page`, `diagram`, `board`, `project`) are saved without `data-label` and with `@` as their inner text (decision 19); chips always show the resolved title.
- **Plain text** (ticket and project descriptions): the token `@[user:7|Ann]` for people and `@[ticket:123]` for items (item labels are stripped on save, decision 19). The label has `[`, `]`, `|` and line breaks removed. Paragraphs are separated by `\n`. Regex (shared by backend and frontend): `@\[(user|ticket|page|diagram|board|project):(\d+)(?:\|([^\]\n]*))?\]`. Text typed by hand that matches the pattern becomes a mention on load; harmless, since access is checked on display.
- The stored length (tokens with labels, or HTML) counts towards the existing limits (`DESCRIPTION_MAX_LENGTH`, `CONTENT_MAX_BYTES`, the comment limits).

### Backend

- `app/models/mentions.rb` (plain Ruby module):
  - `TYPES = %w[user ticket page diagram board project]`, `TOKEN_PATTERN` (the regex above).
  - `refs_in_text(text)` → array of `[type, id]` from plain-text tokens; `refs_in_html(html)` → the same from mention spans (Nokogiri via `Loofah.fragment`, reading `data-mention-type` and `data-id`, skipping invalid types or non-integer ids).
  - `user_ids_in(text_or_html, html:)` → unique user ids mentioned.
- `app/models/rich_text_sanitizer.rb`: `RichTextSanitizer.sanitize(html)` = `Rails::Html::SafeListSanitizer.new.sanitize(html.to_s, tags: <default allowed tags>, attributes: <default allowed attributes> + %w[data-type data-mention-type data-id data-label])`, using `Rails::HTML5::SafeListSanitizer.allowed_tags` / `.allowed_attributes` so the defaults stay. `PagesController` create and update use it instead of `SafeListSanitizer` directly, and `CommentBody.sanitize` (comments spec) delegates to it.
- `app/models/mention_search.rb`: `MentionSearch.new(user:, team:, project_access:, query:, board_id:, project_id:).results` returns at most `LIMIT = 8` result hashes:
  - People: `team.memberships` (active) joined to `User.active`, `LOWER(nickname) LIKE` pattern, ordered by prefix-match first then `LOWER(nickname)`, limit 8. Empty query: first 8 by `LOWER(nickname)`.
  - Items (only when the query is not empty, and only for types whose feature is on): per type, a title-only `LIKE` (`name` for projects), scoped like `SearchController#search_scope` (`project_filtered`-equivalent visibility through `project_access`, tickets through visible boards), ordered by prefix match, then context (`board_id` match for tickets, `project_id` match for the rest; tickets also by their board's project), then `updated_at DESC`, limit 8 each. Merged in Ruby with the same ordering key across types, then people + items truncated to 8.
  - Reuse `TextSearchable.text_search_pattern` for escaping.
- `app/models/mention_resolver.rb`: `MentionResolver.new(user:, team:, project_access:).resolve(refs)` loads each type in one query (`where(id: ids)` within the team, preloading what the JSON needs) and returns one entry per ref:
  - `status: "ok"`: users `{ nickname, avatar }` (active membership); tickets `{ title, board_id, in_backlog }`; others `{ title }`.
  - `status: "removed"` (users only): a former member, with their last nickname from `all_memberships`.
  - `status: "hidden"`: exists in the team but not visible (project access or feature off). No title.
  - `status: "deleted"`: not found in the team (including ids from other teams, so other teams' items look deleted, never hidden).
- `app/models/mention_notifications.rb`: `MentionNotifications.call(source:, before:, after:, actor:, html:)` computes `user_ids_in(after) - user_ids_in(before) - [actor.id]`, keeps active members of `source`'s team who can see the source (`ProjectAccess.users_who_can_see`-style check generalised to the source's project, plus the source type's feature flag), and, when any remain, emits `ActiveSupport::Notifications.instrument("mention.notean", source:, user_ids:, actor:)`. The notifications-inbox spec subscribes to this event and creates the entries. `source` is the `Ticket`, `Page`, `Project` or `Comment`; for a comment, visibility is that of its commentable's item.
- Generalise `ProjectAccess.users_who_can_see(board)` to `users_who_can_see_project(team, project_id)` (keep the board method as a wrapper so callers don't change).
- Call sites (after a successful save, alongside the existing broadcasts):
  - `TicketsController#create` / `#update` (description; `before` is `""` on create or the previous description).
  - `PagesController#create` / `#update` (content).
  - `ProjectsController#create` / `#update` (description).
  - `CommentsController#create` / `#update` (body), once the comments spec is implemented.
- `MentionsController` (`before_action :authenticate_user!`, `set_team`, `authorize_team_member!`; not `FeatureGated`, feature flags are applied per type):

| Route | Params | Response |
|---|---|---|
| `GET /teams/:team_code/mentions/search` | `q` (may be empty, stripped, max 200 chars), `board_id`, `project_id` (both optional context) | `{ results: [{ type, id, title, subtitle, avatar? }] }`; people use `title` for the nickname and carry `avatar`; tickets carry `board_id` and `in_backlog`; `subtitle` is the board title for tickets, the project name for pages, diagrams and boards, null otherwise |
| `POST /teams/:team_code/mentions/resolve` | `{ mentions: [{ type, id }] }`, at most 200 entries | `{ mentions: [{ type, id, status, title?, nickname?, avatar?, board_id?, in_backlog? }] }` |

- Error codes, new module `ErrorCodes::Mentions` (`app/errors/error_codes/mentions.rb`) and frontend `config/errorCodes/mentions.ts`: `TOO_MANY_MENTIONS` (422, over 200 refs) and `INVALID_MENTION` (422, unknown type or non-integer id). Translations under `ERRORS.MENTIONS.*` in every file. A query over 200 characters is truncated, not an error.
- Strong params in `ApplicationController`: `resolve_mentions_params` (`mentions: [ :type, :id ]`).

### Frontend

- `models/mention.model.ts`: `MentionType`, `MentionRef { type, id }`, `MentionCandidate { type, id, title, subtitle, avatar?, boardId?, inBacklog? }`, `ResolvedMention` (`{ status: 'ok' | 'removed' | 'hidden' | 'deleted', ... }`), `MentionContext { boardId?: number, projectId?: number | null }`, and the `Result` response types.
- `utils/mentionTokens.ts` (pure, specced):
  - `parseMentionText(text)` → Tiptap JSON doc (paragraphs per `\n`, text and mention nodes); `serializeMentionDoc(json)` → plain text with tokens.
  - `mentionLabelText(text)` → text with each token replaced by `@label` (Projects list).
  - `cleanMentionLabel(title)` strips `[`, `]`, `|`, line breaks.
- `services/mention.service.ts` (`providedIn: 'root'`, `axiosInstance`, `apiRequest`, `teamPath`, `mapMentionCandidate` / `mapResolvedMention`):
  - `search(query, context)` → `Result<{ results: MentionCandidate[] }, ...>`.
  - `resolve(ref)` → `Promise<ResolvedMention>`, batched: refs requested in the same tick are de-duplicated and sent in one `POST …/mentions/resolve` (chunks of 200). Failure resolves them as `hidden`-looking chips that show the saved label muted, without a link. No persistent cache, so each load shows current titles.
- `utils/mentionExtension.ts`: `createMentionExtension({ mentionService, overlay, injector, context })` returns `Mention.extend({ addAttributes: mentionType, addNodeView })` configured with:
  - `suggestion.char = '@'`, `allowSpaces: true` (titles have spaces), `allowedPrefixes: [' ', '(', '[']` plus line start.
  - `items` debounced 300 ms through `MentionService.search` with the field's `MentionContext`.
  - `render` that opens `MentionPickerComponent` in a CDK overlay positioned at the suggestion's `clientRect` (flexible connected position, flips above when there's no room), passes results, highlight and loading state, and forwards ↑/↓/Enter/Tab/Esc. Esc calls `event.preventDefault()` so the `EscapeService` layer doesn't close the popup.
  - `command` that inserts `{ mentionType, id, label: cleanMentionLabel(title) }` and a space.
  - A node view (`components/mention-chip/` building block, see below) for the chip.
- `components/mention-picker/` (`app-mention-picker`, `npm run newcomponent mention-picker`): presentational and reusable (the chat spec uses it): `@Input() results: MentionCandidate[]`, `@Input() activeIndex`, `@Input() loading`, `@Output() pick = new EventEmitter<MentionCandidate>()`, `@Output() hover = new EventEmitter<number>()`. Uses `.popupPanel`, `app-avatar` for people, `app-icon` for item types, `--row-height` rows, and the "No matches" phrase. `role="listbox"` and `aria-activedescendant`.
- `components/mention-chip/` — a plain function `renderMentionChip(dom, ref, resolved, router)` in `utils/mentionChip.ts` used by the node view (Tiptap node views are plain DOM, not Angular components), plus the `.mentionChip` styles in `styles.css` (chip, person, muted, locked variants; tokens only, `color-mix` tints). The node view starts with the saved label muted, calls `MentionService.resolve`, then fills in the title, icon, avatar colour, tooltip (`aria-label`), and a click handler that navigates with the router: `ticketRoute(boardId, id, inBacklog)`, or the page, diagram, board (`boardRoute`) and project detail routes. Hidden and deleted show the locked phrases.
- `RichTextEditorComponent`: new `@Input() mentionContext: MentionContext | null = null`. When set, the mention extension is added to its extensions. The page editor and the comment editor pass their context.
- New `components/mention-text-editor/` (`app-mention-text-editor`): Tiptap with `StarterKit.configure(...)` turning off everything except document, paragraph, text and undo/redo, plus the mention extension. `@Input() value` (token text), `@Input() placeholder`, `@Input() maxLength`, `@Input() mentionContext`, `@Output() valueChange`, `@Output() focused`, `@Output() blurred`, `@Output() escape` (fired on Esc when no dropdown is open, with the event so callers can `preventDefault`). Emits `serializeMentionDoc(editor.getJSON())`. Enforces `maxLength` on the serialized length with a `filterTransaction`. Shows the placeholder with its own element while empty (no placeholder extension). Applies `value` changes from outside with `setContent` only while not focused. Styled like `.textInput`.
- New `components/mention-content/` (`app-mention-content`): read-only display. `@Input() html` or `@Input() text` (plain token text). Runs a non-editable Tiptap editor with the same schema as the matching editor (rich: the page StarterKit config; plain: the reduced one) plus the mention node view, so chips render the same way and unknown markup is dropped. Updates content on input change.
- Screens:
  - `ticket-detail.component.html`: the description `<textarea>` becomes `<app-mention-text-editor>` bound to `descriptionDraft`, with `maxLength` `DESCRIPTION_MAX_LENGTH`, the placeholder, and context `{ boardId, projectId }`; the existing focus, blur, commit, Esc-cancel, remote-change and conflict logic stays, wired to the new outputs.
  - `project-form.component.html`: the description textarea becomes `<app-mention-text-editor>` (context `{ projectId }`, null when creating); the readonly value becomes `<app-mention-content [text]>`.
  - `project-detail.component.html`: the description becomes `<app-mention-content [text]>`.
  - `projects.component.html`: `{{ mentionLabelText(project.description) }}`.
  - `page-detail.component.html`: the view mode's `[innerHTML]="item.content"` becomes `<app-mention-content [html]>`; the editor gets `[mentionContext]="{ projectId }"`.
  - Comments (comments spec's `app-comment-item` and comment box): body display through `<app-mention-content [html]>` instead of `[innerHTML]`; the comment editor gets the context of its ticket, page or diagram.
- `PHRASES` and all 11 translation files: `MENTION_NO_MATCHES` ("No matches"), `MENTION_PRIVATE_ITEM` ("Private item"), `MENTION_DELETED_ITEM` ("Deleted item"), `MENTION_SEARCHING` ("Searching…"), plus the `ERRORS.MENTIONS.*` entries.

## 2.3 Decisions

1. **Mentionable types:** people (team nickname), tickets, pages, diagrams, boards and projects.
2. **Fields:** comments, ticket descriptions, page content and project descriptions.
3. **Plain-text fields:** replaced with a minimal Tiptap editor (paragraphs, undo and mention chips) whose stored value stays plain text with tokens. Rejected: a textarea plus a separate read view (needs a view/edit toggle in the popup, raw tokens while editing); converting the descriptions to rich HTML (a much larger change, its own spec if ever).
4. **Storage:** id tokens in the text (`@[type:id|label]` in plain text, a mention span in HTML), titles resolved on read. Rejected: a mentions table (only needed for backlinks, out of scope); title snapshots shown as the chip text (stale after renames).
5. **Labels in tokens:** only `user` mentions keep a label (the nickname), used for search, excerpts and the Projects list text, never as the chip's text. Item mentions store no title (decision 19), so searching for a mentioned item's title no longer finds the item that mentions it. Rejected: storing item titles (leaks private titles to readers without access).
6. **Ranking:** one flat list of 8, people first (prefix, then contains, then alphabetical), then items (prefix, then contains, then same board, then same project, then newest). Title, name and nickname only. Rejected: mixing types by match quality alone; grouping by type like global search.
7. **Project scope:** the whole team the writer can see, with the field's board and project ranked higher. The header's project selector is ignored. Rejected: following the selector; no context boost.
8. **Empty `@`:** shows the first 8 members by nickname. Rejected: waiting for one character; recent items.
9. **Hidden and deleted items:** a muted locked chip, "Private item" or "Deleted item", never the title. Items of other teams resolve as deleted. Rejected: title without link (leaks private names); hiding the chip.
10. **Person chips:** not clickable, tooltip only; former members show their last nickname, muted. Rejected: linking to a per-person screen (none exists).
11. **Notifications:** newly added people mentions notify through the inbox. This spec computes who (new, not self, can see the source) and emits `mention.notean` through `ActiveSupport::Notifications`; the notifications-inbox spec subscribes and delivers. Whichever spec lands second connects them. People who can't see the source are skipped, but the picker still lists every member. Rejected: the inbox detecting mentions itself; notifying people without access; hiding them in the picker.
12. **Library:** `@tiptap/extension-mention` and `@tiptap/suggestion` with our own Angular dropdown. Rejected: a hand-written node and trigger (re-implements caret tracking and keys).
13. **Resolving chips:** a batched `POST mentions/resolve` endpoint. Rejected: embedding a `mentions` lookup in every ticket, page, project and comment response (touches many JSON helpers).
14. **Projects list:** plain `@Title` text from the saved label. Rejected: chips in the list.
15. **Search text:** a page's `search_text` keeps person mentions as `@nickname`; item mentions contribute only `@`, so a mentioned item's title is not searchable through the page that mentions it (decision 19). Rejected: keeping item titles in `search_text` (leaks them through search snippets).
16. **Disabled features:** the picker leaves the type out, existing chips show the locked chip.
17. **Read-only rendering:** a read-only Tiptap view (`app-mention-content`) replaces `[innerHTML]` for page view mode, comment bodies and project descriptions, because Angular's `[innerHTML]` sanitizer strips the `data-*` attributes. Rejected: a hand-written DOM renderer (an HTML sanitizer of our own to maintain).

18. **Implementation notes (2026-10-28):**
    - Ticket create takes no description, so only ticket update calls `MentionNotifications` (C2).
    - `MentionTextEditorComponent` applies every outside `value` change, focused or not: the ticket popup already decides when to keep a draft, and its Esc revert needs the editor to follow.
    - Chips are plain-DOM Tiptap node views, so they carry an `aria-label` instead of an `appTooltip`. Person chips show a dot in the avatar colour; locked chips use a new `lock` icon in `IconComponent`.
    - `MentionService.resolve` maps a failed request to a frontend-only `failed` status (saved label, muted, no link).
    - Every `RichTextEditorComponent` that can hold mentions gets a `mentionContext` (page view and edit, comment list and item, diagram comment layer), built with `stableMentionContext` or a template literal so change detection sees a stable object.
    - ~~The saved label is part of the stored content and can leak a private item's title.~~ Closed by decision 19.

19. **Item mentions store no title (2026-10-28, decided by the coordinating session under the user's delegation):** every save normalises item mentions through `Mentions.strip_item_labels(content, html:)`: plain-text item tokens become `@[type:id]`, and HTML item spans lose `data-label` and keep `@` as their text. `PageContent.sanitize`, `CommentBody.sanitize` and the ticket and project description saves call it, so the raw API JSON, `search_text`, search snippets and notification excerpts never contain a mentioned item's title. User mentions keep their nickname label. While an item chip resolves it shows its type icon and "…". Accepted trade-off: searching for a mentioned item's title no longer finds the containing item.

## Cross-spec reconciliation (decided 2026-10-28, overrides Part 2 where they differ)

Implementation order is comments → notifications-inbox → mentions, and attachments is merged before this spec. So:

- **Notifications:** no `mention.notean` event. `MentionNotifications.call` computes the newly mentioned users as described and calls `Notifier.mentioned(item, actor, users, excerpt:)` from the notifications-inbox spec directly. For a comment, `item` is its ticket, page or diagram; for a project description, it is the `Project` (the inbox spec supports `Project` for this kind). In `CommentsController#create` call it before `Notifier.commented` and pass the mentioned users as `except:`. Recipient visibility reuses the inbox spec's generalised `ProjectAccess.users_who_can_see(record)`; don't add a second `users_who_can_see_project` method.
- **Sanitising:** the attachments spec already added `PageContent.sanitize` for page HTML. Extend that allow-list with the mention `data-*` attributes instead of adding `RichTextSanitizer`, and have `CommentBody.sanitize` reuse the same allow-list (one place for rich-text sanitising).
- **Page view mode:** the attachments spec already renders page view mode through a read-only `RichTextEditorComponent`. Pass `mentionContext` to that read-only editor instead of switching the page to `app-mention-content`. `app-mention-content` is still used for comments, project descriptions and chat.
- **Trash:** trashed items are hidden by the trash spec's default scope, so `MentionSearch` never offers them and `MentionResolver` resolves them as `deleted` without extra code. Add a test for each.

## Related specs

- **comments** (`comments.spec.md`): this spec depends on it for mentions in comments. `CommentBody.sanitize` delegates to `RichTextSanitizer`, the comment editor passes `mentionContext`, `app-comment-item` renders bodies with `app-mention-content`, and `CommentsController#create` / `#update` call `MentionNotifications`. If comments isn't implemented yet, block E's comment tasks wait for it.
- **notifications-inbox**: subscribes to `mention.notean` (`source`, `user_ids`, `actor`) and creates "mentioned you" entries that link to the source.
- **trash**: trashed items should resolve as `deleted` in `MentionResolver` and be left out of `MentionSearch` (the trash spec adds its scope to both).
- **copy-link**: chips link inside the active team with plain routes; a hidden item never gets a link, so the `/unavailable` screen isn't involved.
- **chat**: reuses `MentionPickerComponent`, `createMentionExtension`, the chip node view, `app-mention-content` and both endpoints; it wires its own fields and decides whether its messages notify.
- **attachments, templates**: no interaction. Templates copy content as is, so mentions in a template carry over.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: `bin/rails test` 799 runs, 0 failures; `npm test` 891 specs, 0 failures.

### A. Backend building blocks
- [x] A1. Add `Mentions` (`app/models/mentions.rb`) with `TYPES`, `TOKEN_PATTERN`, `refs_in_text`, `refs_in_html`, `user_ids_in`. Tests in `test/models/mentions_test.rb`: tokens with and without labels, invalid types and ids skipped, HTML spans parsed, duplicates collapse.
- [x] A2. Add `RichTextSanitizer` and switch `PagesController` create and update to it. Tests: mention span attributes survive, `script` and other attributes are still stripped, existing page sanitising tests still pass.
- ~~A3. Generalise `ProjectAccess.users_who_can_see` to a project-level method, keeping the board wrapper. Test the project-level method for a project item and for a team-wide item.~~ Obsolete: the inbox spec already generalised `ProjectAccess.users_who_can_see(record)`, and `Notifier` checks visibility itself.

### B. Backend endpoints
- [x] B1. Add `ErrorCodes::Mentions`, `resolve_mentions_params`, and the two routes in `config/routes.rb`.
- [x] B2. Add `MentionSearch` and `MentionsController#search`. Tests in `test/controllers/mentions_controller_test.rb`: empty query returns 8 members by nickname; people before items; prefix before contains; same board and project ranked higher; at most 8; hidden project items, removed members, deleted users and disabled-feature types excluded; other teams' items never appear; query count with 1 and 10 matching items per type is equal.
- [x] B3. Add `MentionResolver` and `MentionsController#resolve`. Tests: `ok` with current titles after a rename, ticket `board_id` / `in_backlog`, `removed` with the last nickname, `hidden` for private project items and disabled features with no title in the JSON, `deleted` for missing ids and other teams' ids, `TOO_MANY_MENTIONS`, `INVALID_MENTION`, non-member rejected, query count with 1 and 10 refs per type is equal.

### C. Backend notifications
- [x] C1. Add `MentionNotifications` emitting `mention.notean`. Model tests: only newly added people, never the actor, only active members who can see the source, nothing emitted when nobody remains.
- [x] C2. Call it from `TicketsController` create and update, `PagesController` create and update, and `ProjectsController` create and update. Controller tests subscribe to the event and check the payload and that unchanged mentions emit nothing.

### D. Frontend building blocks
- [x] D1. `npm install @tiptap/extension-mention@^3.32.0 @tiptap/suggestion@^3.32.0`.
- [x] D2. Add `models/mention.model.ts`, `config/errorCodes/mentions.ts`, the `PHRASES` keys and all 11 translation files.
- [x] D3. Add `utils/mentionTokens.ts` with specs: parse/serialize round-trip, line breaks, labels cleaned, hand-typed tokens parsed, `mentionLabelText`.
- [x] D4. Add `MentionService` with `search` and batched `resolve`. Spec: refs in one tick become one request, duplicates de-duplicated, chunks of 200, failure resolves to the fallback.
- [x] D5. Create `app-mention-picker`. Spec: renders people with avatars and items with icons and subtitles, highlights `activeIndex`, emits `pick` on click, shows "No matches".
- [x] D6. Add `utils/mentionChip.ts`, the `.mentionChip` styles in `styles.css`, and `utils/mentionExtension.ts` (suggestion config, overlay, node view). Spec the chip rendering for each status and the navigation per type.
- [x] D7. Add `mentionContext` to `RichTextEditorComponent`. Spec: the extension is only added when a context is set.
- [x] D8. Create `app-mention-text-editor`. Spec: emits token text, keeps chips across `value` changes, respects `maxLength`, ignores outside `value` while focused, Esc with no dropdown emits `escape`.
- [x] D9. Create `app-mention-content` for `html` and `text`. Spec: chips render, unknown markup is dropped, input changes re-render.

### E. Screens
- [x] E1. Ticket popup: replace the description textarea with `app-mention-text-editor`, keeping draft, commit on blur, Esc cancel, remote changes and the edit-conflict dialog. Update `ticket-detail` specs.
- [x] E2. Project form, project detail and Projects list as in 2.2. Update their specs.
- [x] E3. Page detail: `app-mention-content` in view mode and `mentionContext` on the editor.
- [x] E4. Comments (needs the comments spec implemented): `RichTextSanitizer` in `CommentBody`, `app-mention-content` in `app-comment-item`, `mentionContext` on the comment editor, `MentionNotifications` in `CommentsController` create and update, with tests.
- [x] E5. Check the component style budgets still pass after the new styles.

### Z. Wrap-up
- [x] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md` (`bin/rails test`, `bin/rubocop`, `bin/brakeman`, `npm test`, `npm run build`).
- [x] Z2. Update the root `CLAUDE.md`: the mentions routes, `Mentions` / `MentionSearch` / `MentionResolver` / `MentionNotifications` / `RichTextSanitizer`, the token formats, the new frontend components and `MentionService`, the `mention.notean` event, and the new Tiptap packages in the tech stack.
- [ ] Z3. Manual check in the running app with two users, one without access to a private project: mention a person, a ticket, a page, a diagram, a board and a project in a ticket description, a page, a project description and a comment; check ranking with the field's board first; rename a mentioned item and see the new title; open each chip; as the user without access see "Private item"; delete an item and see "Deleted item"; turn boards off and see ticket chips lock and tickets leave the picker; check Esc closes only the dropdown.
