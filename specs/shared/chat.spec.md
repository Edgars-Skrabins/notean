# Chat — Spec

**Type:** feature
**Status:** ready for implementation (after mentions, notifications-inbox and trash are merged)
**Last updated:** 2026-10-28

# Part 1 — Business logic and usage

Chat adds Slack-style channels to a team, so people can talk next to their documents, diagrams and boards instead of in another tool. It is a team feature with its own flag, like Pages, Diagrams and Boards, so a team owner can turn it off. Messages arrive instantly, can carry emoji, links to items, `@user` mentions and GIFs, and can be reacted to.

There are three kinds of channel, which differ only in who can see them:

- **Team-wide** (no project): every member of the team.
- **Project-scoped**: everyone who can see the project, which is the project's members plus the team owner and admins (the same rule as the project's pages and boards). Nobody joins; access is automatic and follows project membership.
- **User-scoped**: a chosen list of team members. The team owner and admins also see every user-scoped channel, even when they are not on its list.

- **Users:** team members talking with their team, a project's people, or a chosen group. Team owners and admins set channels up.
- **Usage:**
  1. The sidebar has a **Chat** entry right below **Home** (hidden when the team has chat off). Clicking it does not open a page; it expands and collapses a list under it, exactly like the **Boards** sidebar list. The open/closed state is remembered per device.
  2. The list shows the channels the user can see, filtered by the header's project selector like the boards list: with a project selected, that project's channels plus team-wide and user-scoped ones. Each row shows `#` and the channel name, with an unread count badge (`99+` above 99) when there are unread messages. Rows can be dragged into a personal order (per team, per device); new or newly visible channels appear at the top, newest first. With the sidebar collapsed, the Chat icon shows the total unread count of the listed channels as a badge. An empty list shows "No channels yet".
  3. Below the channels is **Create channel**, shown only to people who may create at least one kind of channel (see Rules). It opens a dialog with: name; kind (Team-wide, Project, Users, showing only the kinds the user may create); for Project, a project dropdown limited to projects the user may create channels for, defaulting to the header's selected project when allowed; for Users, a member picker over active team members (the creator is always included). Create saves, adds the channel to the top of the list and opens it.
  4. Clicking a channel opens the chat page at `/dashboard/chat/:id`. Its header shows `#name`, the scope (project name, "Team-wide", or the member avatars for a user-scoped channel) and, for people who may manage the channel, a settings button. For a user-scoped channel any member also sees a **Leave** action.
  5. The page opens scrolled to the first unread message, marked with a "New" divider, or at the bottom when nothing is unread. It shows the newest 50 messages; scrolling to the top loads 50 older ones until the start of the channel is reached. Each message shows the author's avatar and team nickname, the time, the text with line breaks, auto-linked URLs, mention and item chips, an "(edited)" mark if edited, and its reactions. Consecutive messages from one author within a few minutes are grouped under one avatar and name.
  6. The composer at the bottom is a plain-text field. Enter sends, Shift+Enter adds a line break. An emoji button opens the emoji picker and inserts at the cursor. Typing `@` opens the shared mention picker from the mentions spec (8 nearest users and items); picking a user inserts a mention, picking a page, diagram, board or ticket inserts an item link. Typing `/gif <words>` as the whole message shows a grid of matching GIFs above the composer ("Powered by GIPHY" shown); clicking one sends it as a GIF message right away and clears the composer. Esc closes the GIF grid or the emoji picker.
  7. While someone types, the others viewing that channel see "Anna is typing…" (or "Anna and Jānis are typing…", "Several people are typing…") under the message list. It disappears a few seconds after they stop or when their message arrives.
  8. Hovering a message shows a reaction bar with the user's 6 last used reaction emoji (a default six until they have reacted: 👍 ❤️ 😂 😮 😢 🎉) and a **+** button that opens the full emoji picker. Reactions show as chips with emoji and count under the message; the user's own reactions are highlighted; clicking a chip toggles the user's reaction; hovering a chip lists who reacted.
  9. The author also gets **Edit** and **Delete** on hover; team owners and admins get **Delete** on everyone's messages. Edit turns the message into an inline field (Enter saves, Esc cancels). Delete asks for confirmation and removes the message for everyone. GIF messages can be deleted but not edited.
  10. The settings dialog (people who may manage the channel) has: name, GIF rating (`pg` default or `pg-13`), and for user-scoped channels the member list (add or remove team members). It also has **Delete channel**, which asks for confirmation and moves the channel to Trash. The kind and project can never be changed.
  11. Messages, edits, deletes, reactions, typing, and channel creates, renames, member changes and deletes all reach every viewer live. A channel that the user loses access to (removed from a user-scoped list, removed from the project, channel trashed) disappears from their list; if it is open, they are sent to Home with a toast.
  12. Opening a channel marks it read up to its newest message. While the channel is open and the browser tab is visible, arriving messages are marked read as well. Read state is kept on the server, so counts match across devices.
  13. An `@user` mention in a message also creates an inbox entry for that user (notifications-inbox spec), if they can see the channel. Clicking it opens the channel at that message.
  - **Loading:** the list and the message area show the app's usual loading state. **Errors:** failed requests show a toast with the translated error code; a failed send keeps the text in the composer. If GIF search is not configured or Giphy fails, the GIF grid shows "GIFs are unavailable right now".
- **Rules:**
  - **Feature flag:** `chat_enabled` on `Team`, on by default, toggled only by the team owner in Manage team like the other features. With chat off, every chat endpoint returns 403 `FEATURE_DISABLED`, the cable subscription is rejected, the sidebar entry and route are hidden, and members on a chat page are sent Home with a toast. Turning it off never deletes data.
  - **Creating channels:**
    - Team-wide: team owner and admins.
    - Project-scoped: the team owner, team admins, and the project's owner, for that project.
    - User-scoped: team owner and admins. The creator is always a member.
    - Everyone else sees no Create channel row.
  - **Managing a channel** (rename, GIF rating, user-scoped members, delete, restore from Trash): its creator, plus anyone who may create that kind of channel for that scope (team owner and admins for all; the project owner for their project's channels).
  - **Names:** free text, 1 to `TITLE_MAX_LENGTH` (200) characters after trimming, unique per team ignoring case (422 `CHAT_CHANNEL_NAME_TAKEN`). Trashed channels still reserve their name.
  - **Leaving:** any listed member of a user-scoped channel can leave it, except that a channel must keep at least one member (the last member can't leave; they can delete it if they may manage it). Team-wide and project channels can't be left.
  - **Messages:** plain text, 1 to 4,000 characters after trimming, or one GIF. Only the author edits a text message; the author, the team owner and admins delete messages. Deleted messages are gone for good (no placeholder). Messages are kept forever.
  - **Reactions:** anyone who can see the channel can react. One reaction per emoji per user per message; at most 20 distinct emoji per message (422 `CHAT_REACTION_LIMIT`). An emoji is a single emoji grapheme.
  - **GIFs:** searched and resolved through the backend, so the Giphy key never reaches the browser. The client sends only a Giphy GIF id; the server fetches its details from Giphy with the channel's rating and stores them. GIF search is rate limited per user.
  - **Unread:** messages newer than the user's last read message in that channel, not counting their own.
  - **Team membership removal** (removed, left, account deleted): their user-scoped channel memberships and read states in that team are dropped; their messages and reactions stay and keep their nickname, as content does today. If that empties a user-scoped channel, the channel stays for the managers.
  - **Project deletion:** with "delete items" the project's channels go to Trash with its other items; with "keep" they become team-wide channels (the only time a channel's scope changes).
  - **Trash:** a trashed channel and its messages are hidden from everyone and from every endpoint except Trash; restoring brings it back with its messages, reactions and members. The trash spec's 14-day purge deletes it with everything in it.
- **Out of scope:**
  - Threads and replies, message search and channels in global search, typing in other channels, pinned messages, attachments in chat (attachments spec covers tickets and pages only), favorites for channels, archiving, direct messages outside user-scoped channels, rich formatting (bold, code blocks). All could be later specs.
  - Inbox entries for anything other than `@user` mentions.
  - Per-device push or e-mail notifications.

# Part 2 — Technical details

## 2.1 Tools and libraries

- Existing stack: Rails models and controllers, ActionCable through `CableService`, Angular CDK (drag-drop for the sidebar order, overlay for the emoji picker, GIF grid and reaction picker), `appTooltip`, `EscapeService`, ngx-translate.
- **New frontend dependency:** `emoji-picker-element` (latest 1.x at install time; record the exact version in this section when installing) and `emoji-picker-element-data` (`^1`). It is a small web component with search, categories and skin tones. Its default data source is a CDN, which the CSP forbids, so the English data file `emoji-picker-element-data/en/emojibase/data.json` is copied to the build output as an asset (an `assets` glob in `angular.json`, served at `/assets/emoji/data.json`) and passed as `dataSource`. The picker's labels (`i18n` property) come from our translation files; emoji names and search keywords stay English in every language. The picker is imported only from the chat components, which live under the lazy dashboard routes, so it stays out of the initial bundle. Angular needs `CUSTOM_ELEMENTS_SCHEMA` on the component that renders `<emoji-picker>`.
- **New backend dependency:** none. Giphy is called with `Net::HTTP` from a small `GiphyClient` (`app/models/giphy_client.rb`) using the Giphy API (`/v1/gifs/search` with `api_key`, `q`, `limit=24`, `rating`, `offset`; `/v1/gifs/:id`). The key lives in Rails credentials as `giphy.api_key`, read through `Rails.application.credentials.dig(:giphy, :api_key)`. Without a key the GIF endpoints return 503 `GIFS_UNAVAILABLE`. Tests stub `GiphyClient`.
- **CSP** (`frontend/src/index.html`): add `https://media.giphy.com https://*.giphy.com` to `img-src`. `connect-src` doesn't change (search goes through our API).
- **Rate limit** (`config/initializers/rack_attack.rb`): throttle `chat/gifs` by user token or IP, 30 requests per minute.

## 2.2 Structure

### Data model (edit the single `create_schema` migration and rebuild, per the project's schema approach)

- `teams.chat_enabled` boolean, default true, null false. `Team::FEATURES` gains `chat`.
- `chat_channels`: `team_id`, `name` (string, null false), `scope` (string, `team` / `project` / `users`), `project_id` (nullable; set exactly when scope is `project`), `gif_rating` (string, `pg` or `pg-13`, default `pg`), `created_by_user_id`, `last_message_at` (datetime, nullable), the trash spec's soft-delete column(s), timestamps. Unique index on `team_id, LOWER(name)`. Model `ChatChannel` (`belongs_to :team`, optional `:project`, `creator`), validates name with `ContentLimits::TITLE_MAX_LENGTH`.
- `chat_channel_members`: `chat_channel_id`, `user_id`, timestamps, unique on both. Only used for `users` scope. Model `ChatChannelMember`.
- `chat_messages`: `chat_channel_id`, `user_id` (author), `body` (text, default ''), `kind` (`text` or `gif`), `gif` (jsonb, nullable: `{ id, url, width, height, title }` using Giphy's `fixed_height` rendition), `edited_at` (nullable), timestamps. Index on `chat_channel_id, id`. Model `ChatMessage` with `MAX_LENGTH = 4_000` added to `ContentLimits` as `MESSAGE_MAX_LENGTH` (with `MESSAGE_TOO_LONG` from `limit_error_code`).
- `chat_reactions`: `chat_message_id`, `user_id`, `emoji` (string), `created_at`. Unique on `chat_message_id, user_id, emoji`. Model `ChatReaction`, `MAX_DISTINCT = 20`.
- `chat_read_states`: `chat_channel_id`, `user_id`, `last_read_message_id`, timestamps, unique on channel and user. Model `ChatReadState`.
- Deleting a channel (purge) deletes members, messages, reactions and read states (`dependent: :delete_all` or foreign-key cascade, matching the schema's existing style).

### Access

`ChatAccess` (`app/models/chat_access.rb`), built per user and team on top of `ProjectAccess`:

- `visible_scope(relation)`: not trashed, and `scope = team`, or `scope = project` with `project_id` in `ProjectAccess#visible_project_ids`, or `scope = users` with the user a member or `ProjectAccess#manager?`.
- `visible?(channel)`, `can_create?(scope, project)`, `can_manage?(channel)` per Part 1's rules (project owner is `project.owner_user_id`).
- `self.user_ids_who_can_see(channel)`: team members for `team`; `ProjectAccess.users_who_can_see`-style query for `project`; members plus team owner and admins for `users`. Used for broadcasts and for mention notifications.

### API (all under `teams/:team_code`, controllers include `FeatureGated` with `require_feature!(:chat)`)

- `ChatChannelsController`
  - `GET chat_channels` (`project_id` optional, filtered like boards: that project plus team-wide and user-scoped) → `{ chat_channels: [chat_channel_summary_json] }`, not paginated. Summary: `id, name, scope, project_id, gif_rating, created_by_user_id, last_message_at, unread_count, can_manage`. `unread_count` comes from one grouped count query over all listed channels (`chat_messages.id > last_read_message_id` and `user_id != current`), so the query count stays flat.
  - `GET chat_channels/:id` → `{ chat_channel: chat_channel_json }` (summary plus `members` as `member_json` for `users` scope, and `project: { id, name }`).
  - `POST chat_channels` `{ chat_channel: { name, scope, project_id, member_ids: [] } }` → 201. Errors: `FORBIDDEN` (may not create that kind), `PROJECT_NOT_FOUND`, `CHAT_CHANNEL_NAME_TAKEN`, `TITLE_TOO_LONG`, `CHAT_CHANNEL_MEMBERS_INVALID` (a non-member id), `CHAT_CHANNEL_CREATE_FAILED`.
  - `PATCH chat_channels/:id` `{ chat_channel: { name, gif_rating, member_ids } }` (`member_ids` only for `users` scope, replaces the list and always keeps at least one) → updated `chat_channel_json`. `can_manage?` required.
  - `DELETE chat_channels/:id` → moves to Trash through the trash spec's mechanism, 204.
  - `POST chat_channels/:id/leave` → 204; 422 `CHAT_CHANNEL_LAST_MEMBER`, 422 `CHAT_CHANNEL_NOT_LEAVABLE` for other scopes.
  - `POST chat_channels/:id/read` `{ last_read_message_id }` → 204; only moves forward.
- `ChatMessagesController` (nested under `chat_channels/:chat_channel_id`)
  - `GET messages` (`before` message id optional, page size `PAGE_SIZE` 50, newest first from the server, rendered oldest first) → `{ messages: [chat_message_json], has_more, last_read_message_id }`. Also `around` (message id) to open at a message from the inbox: 25 before and 25 after, with `has_more_before` / `has_more_after`. `chat_message_json`: `id, kind, body, gif, author: member_json, created_at, edited_at, reactions: [{ emoji, user_ids }]`. Preloads authors with `User::AVATAR_PRELOAD` and reactions.
  - `POST messages` `{ message: { body } }` or `{ message: { gif_id } }` → 201. Creates the message, sets `last_message_at`, advances the author's read state, creates `chat_mention` inbox entries through the notifications-inbox spec's API for mentioned users who can see the channel. Errors: `MESSAGE_EMPTY`, `MESSAGE_TOO_LONG`, `GIF_NOT_FOUND`, `GIFS_UNAVAILABLE`.
  - `PATCH messages/:id` `{ message: { body } }` → author only and `text` kind only (403 `FORBIDDEN`), sets `edited_at`, re-syncs mention notifications as the mentions spec does for edits.
  - `DELETE messages/:id` → author, team owner or admin; 204; drops its inbox entries.
- `ChatReactionsController`: `POST` and `DELETE chat_channels/:chat_channel_id/messages/:message_id/reactions` `{ reaction: { emoji } }` → `{ reactions: [...] }` for that message. 422 `CHAT_REACTION_LIMIT`, 422 `CHAT_REACTION_INVALID`.
- `ChatGifsController`: `GET chat_channels/:chat_channel_id/gifs?q=&offset=` → `{ gifs: [{ id, url, width, height, title }], has_more }` using the channel's rating.
- Strong params go in `ApplicationController` (`create_chat_channel_params`, `update_chat_channel_params`, `chat_message_params`, `chat_reaction_params`). `update_team_features_params` permits `chat_enabled`.
- Error codes: new `app/errors/error_codes/chat.rb` (`ErrorCodes::Chat`: `CHAT_CHANNEL_NOT_FOUND`, `CHAT_CHANNEL_NAME_TAKEN`, `CHAT_CHANNEL_MEMBERS_INVALID`, `CHAT_CHANNEL_CREATE_FAILED`, `CHAT_CHANNEL_UPDATE_FAILED`, `CHAT_CHANNEL_LAST_MEMBER`, `CHAT_CHANNEL_NOT_LEAVABLE`, `MESSAGE_NOT_FOUND`, `MESSAGE_EMPTY`, `CHAT_REACTION_LIMIT`, `CHAT_REACTION_INVALID`, `GIF_NOT_FOUND`, `GIFS_UNAVAILABLE`), plus `MESSAGE_TOO_LONG` wherever `limit_error_code` codes live. Mirrored in `frontend/src/app/config/errorCodes/chat.ts` and `ERRORS.CHAT.*` in every translation file.

### Realtime: `ChatCable`

- `app/channels/chat_cable.rb`, `ChatCable < ApplicationCable::Channel`, param `team_code`. Subscribes active members of the team while chat is on and streams `chat:<team_id>:user:<user_id>` (`ChatCable.stream_name(team, user)`). Rejected otherwise.
- `ChatBroadcast` (`app/models/chat_broadcast.rb`) sends each event to every user from `ChatAccess.user_ids_who_can_see(channel)`, called by the controllers on a separate line after `render` (like `BoardBroadcast`). Events, payloads built with the controllers' JSON helpers:
  - `message_created` `{ chat_channel_id, message }`, `message_updated`, `message_deleted` `{ chat_channel_id, message_id }`, `reactions_changed` `{ chat_channel_id, message_id, reactions }`.
  - `channel_upserted` `{ chat_channel }` (create, rename, rating, members; the summary is per recipient, so `unread_count` and `can_manage` are computed per user or omitted and kept by the client), `channel_removed` `{ chat_channel_id }` (deleted or trashed; also sent to users dropped from a user-scoped channel), `channels_changed` (sent to a user whose visible set changed for other reasons: project membership changes in `ProjectsController` and `ProjectAccessCleanup`, role changes in `MembersController`, project deletion; the client reloads its list).
  - `typing` `{ chat_channel_id, user }`: the client calls `perform('typing', { chat_channel_id })` at most every 3 seconds while typing; `ChatCable#typing` checks visibility and broadcasts to the channel's viewers except the sender.
- `TeamsController#update_features` already broadcasts `features_changed`; nothing new there.

### Membership and project hooks

- `MembershipRemoval.apply` deletes the user's `chat_channel_members` and `chat_read_states` for the team's channels.
- `ProjectsController#destroy`: `delete_items` trashes the project's channels; `keep` updates them to `scope: team, project_id: nil`, then `channels_changed` to the team.
- `ProjectAccessCleanup` and project member changes send `channels_changed` to users who gained or lost access.

### Frontend

- **Models** `models/chat.model.ts`: `ChatChannelSummary`, `ChatChannel`, `ChatChannelScope` (`'team' | 'project' | 'users'`), `ChatMessage`, `ChatReaction`, `Gif`, response `Result` types. `TeamFeature` gains `'chat'`; `mapTeam` maps `chatEnabled`.
- **Services** (`providedIn: 'root'`, axios through `apiRequest`, `teamPath`, `map*` functions):
  - `ChatService`: channel CRUD, leave, read, messages (list with `before` / `around`, send, edit, delete), reactions, GIF search.
  - `ChatListService` (modelled on `BoardListService`): loads the sidebar list (follows `ProjectFilterService`, empty when chat is off), keeps the personal order in `localStorage` (`chatChannelOrder:<team>`, new and unknown channels first, newest first, reusing the `orderBoards` approach), the open state (`sidebarChatOpen`), unread counts and the total. Exposes `channels$`, `totalUnread$`, `add`, `remove`, `upsert`, `move`, `markRead`.
  - `ChatCableService`: one `CableService.subscribe({ channel: 'ChatCable', team_code }, …)` per active team, connected from `DashboardComponent` next to `TeamChannelService`, reconnected on team switch, unsubscribed on `disconnect()`. Exposes typed observables per event (`messageCreated$`, `messageUpdated$`, `messageDeleted$`, `reactionsChanged$`, `channelUpserted$`, `channelRemoved$`, `channelsChanged$`, `typing$`) and `sendTyping(channelId)`. `ChatListService` applies channel events and bumps unread counts on `messageCreated$` for messages by others in channels that aren't open and visible; it reloads on `channelsChanged$` and on `TeamChannelService.membersChanged$`.
  - `RecentReactionsService`: the 6 last used reaction emoji in `localStorage` (`recentReactions`), defaulting to 👍 ❤️ 😂 😮 😢 🎉.
- **Routing:** `AppRoutes.CHAT = 'chat'`; `dashboardRoutes` gets `{ path: \`${AppRoutes.CHAT}/:id\`, component: ChatPageComponent, canActivate: [featureGuard('chat')] }`. `utils/routeFeature.ts` maps `chat` to `'chat'` so the dashboard's disabled-feature redirect covers it. No `/dashboard/chat` index route: the unknown-route redirect handles it.
- **Components** (each standalone, Eager, own `.ts/.html/.css`, split further when a stylesheet nears the 4 kB budget):
  - `components/sidebar-chat/`: the Chat sidebar entry and list, mirroring `SidebarBoardsComponent` (toggle, `cdkDropList` rows with unread badge, empty text, Create channel row, collapsed badge with total). `DashboardSidebarComponent` renders it right after the Home link when `features.chat`.
  - `components/create-chat-channel-dialog/`: the create dialog (name with `[maxlength]="TITLE_MAX_LENGTH"`, kind, project dropdown via the existing project select, member picker). Pushes on `EscapeService`.
  - `components/chat-channel-settings-dialog/`: rename, GIF rating, members, Delete channel (through `ConfirmDialogComponent`).
  - `components/chat-member-picker/`: multi-select of active team members with avatars, shared by the two dialogs.
  - `pages/dashboard/chat-page/` (`ChatPageComponent`): loads the channel by `:id` (404 → Home with a toast), header, settings, leave, owns the open-channel state and read marking (`document.visibilityState`), redirects Home with a toast on `channelRemoved$` for its channel. Reads an optional `?message=<id>` query param to open `around` that message (inbox links).
  - `components/chat-message-list/`: scroll container, older-page loading at the top while keeping the scroll position, "New" divider, grouping, typing line.
  - `components/chat-message/`: one message (avatar, nickname, time, body rendering, GIF image with width/height reserved, "(edited)", hover actions, inline edit, reactions row).
  - `components/chat-message-body/`: renders plain text safely (no `innerHTML` with user text): splits into text, line breaks, auto-linked URLs (`http`/`https` only, `target="_blank" rel="noopener noreferrer"`), and mention/item tokens rendered with the mentions spec's chip renderer.
  - `components/chat-reactions/`: chips with counts, own highlight, tooltip of nicknames, the recent-six bar and **+**.
  - `components/chat-composer/`: textarea, Enter/Shift+Enter, emoji button, the mentions spec's `@` picker attached to the textarea, `/gif` detection and the GIF grid, typing pings, keeps text on failed send.
  - `components/emoji-picker/`: wraps `<emoji-picker>` in a CDK overlay with our `dataSource` and translated `i18n`, emits the chosen emoji. Used by composer and reactions.
  - `components/gif-picker/`: debounced (300 ms) search through `ChatService`, grid, load more, "Powered by GIPHY", unavailable state.
- **Manage team:** `featureOptions` gains `{ feature: 'chat', label: PHRASES.FEATURE_CHAT }`.
- **i18n:** new `PHRASES` keys (sidebar label, empty list, create/settings dialogs, kinds, GIF rating, leave, delete confirms, typing lines, "New", "(edited)", "Powered by GIPHY", GIFs unavailable, emoji picker labels, toasts) in `config/phrases.ts` and every translation file.

### Tests

- Backend models: `ChatAccess` (visibility per scope and role, creation and management rules, `user_ids_who_can_see`), `ChatChannel` name uniqueness ignoring case, `ChatMessage` limits, `ChatReaction` uniqueness and 20-emoji cap, `MembershipRemoval` dropping chat members and read states.
- Backend controllers: every endpoint's happy path and permission failures; feature-off 403; unread counts (own messages excluded, read state only forward); list filtered by project; query-count tests for `GET chat_channels` and `GET messages` (1 vs 10 items); `before` / `around` pagination; GIF endpoints with a stubbed `GiphyClient` (rating passed, unknown id, missing key → 503); project delete in both modes; mention creates an inbox entry only for users who can see the channel; broadcasts reach exactly the users who can see the channel (`assert_broadcasts` per user stream).
- Backend channel: `ChatCable` rejects non-members and feature off; `typing` broadcasts only for visible channels.
- Frontend: `ChatListService` ordering, unread bumping and total; `ChatCableService` event dispatch; `chat-message-body` tokenising (URLs, line breaks, no HTML injection); composer Enter vs Shift+Enter and `/gif` detection; `RecentReactionsService`; `featureGuard`/`routeFeature` with `chat`; sidebar shows Chat below Home only when enabled.

## 2.3 Decisions

1. **What is a "user-scoped" channel?** A named channel whose access is a chosen list of team members instead of a project. There are no separate unnamed DMs.
2. **Who sees project channels?** Everyone who can see the project (members plus team owner and admins), automatically, no joining. Same rule as other project items.
3. **Team-wide channels?** Yes: a channel with no project is visible to the whole team, mirroring project-less pages and boards.
4. **Who creates channels?** Team-wide: team owner and admins. Project: team owner, admins and the project's owner. User-scoped: team owner and admins. Regular members create none. Rejected: any member creating.
5. **User-scoped members after creation?** The creator and managers edit the list; any member can leave. Rejected: fixed lists, members inviting others.
6. **Do managers see user-scoped channels they aren't in?** Yes, team owner and admins see all. Rejected: members-only privacy.
7. **Names:** free text up to 200, unique per team ignoring case. Rejected: Slack slug style, non-unique.
8. **Lifecycle:** rename and delete, no archiving. Managing is for the creator plus anyone who could create that kind for that scope.
9. **Delete goes to Trash** (trash spec), restorable for 14 days. Rejected: permanent delete.
10. **Scope is fixed** after creation. The one exception is deleting a project with "keep items", which turns its channels team-wide; "delete items" trashes them.
11. **Messages:** authors edit and delete their own; team owner and admins delete any. Plain text up to 4,000 characters with chips, no formatting. Rejected: light markdown, Tiptap.
12. **No threads** in this spec. Rejected: quote replies, Slack threads (could be a later spec).
13. **Reactions:** yes; hover bar shows the 6 last used emoji (localStorage per device, default six) and **+** for the full picker; max 20 distinct emoji per message. Rejected: fixed quick set only, server-stored recents.
14. **Unread:** per-channel count in the list plus a total on the collapsed entry, from a server-side last-read message id per user and channel. Read marking: on open, and for arriving messages while the channel is open and the tab visible; opens at the first unread with a "New" divider.
15. **Emoji picker:** `emoji-picker-element` with self-hosted English data; picker labels translated. Rejected: own curated picker, native only, per-language data.
16. **GIFs:** Giphy, proxied through the backend with the key in credentials; `/gif <words>` opens a picker grid, clicking sends. Rating per channel: `pg` default, `pg-13` allowed, set in channel settings. Tenor was rejected because Google shut down the public Tenor API on 2026-06-30.
17. **Item links and mentions:** reuse the mentions spec's `@` picker and tokens. `@user` mentions in chat create inbox entries (notifications-inbox spec), only for users who can see the channel. No other chat events go to the inbox.
18. **History:** kept forever; opens at the newest 50 (or first unread), loads 50 older on scroll to the top using a `before` message-id cursor (not `offset`, since new messages keep arriving).
19. **Sidebar list:** personal drag order like boards, new channels on top, follows the header's project selector.
20. **Typing indicators:** yes, through `ChatCable#typing`.
21. **Layout:** a full dashboard page per channel at `/dashboard/chat/:id`; the sidebar list is the only switcher. Rejected: an in-page channel column.
22. **Realtime:** one `ChatCable` subscription per user and team, server fan-out to each user who can see the channel. Rejected: one subscription per chat channel.
23. **Global search:** chat stays out of it in this spec.
24. **Code names:** models `ChatChannel`, `ChatChannelMember`, `ChatMessage`, `ChatReaction`, `ChatReadState`; ActionCable class `ChatCable`. UI says "channel".
25. **Feature flag:** `chat_enabled`, on by default like the others.
26. **Dependencies:** implement only after the mentions, notifications-inbox and trash specs are merged, reusing their pieces directly.

## Related specs

- **mentions** (`specs/shared/mentions.spec.md`): chat's composer reuses its `@` picker (8 nearest users and items) on a plain textarea, its stored token format, and its chip rendering. Chat messages are a new mention source.
- **notifications-inbox** (`specs/shared/notifications-inbox.spec.md`): chat adds one notification type for `@user` mentions in messages (proposed `chat_mention`), linking to `/dashboard/chat/:id?message=<id>`; deleting the message drops it.
- **trash** (`specs/shared/trash.spec.md`): chat channels are a new trashable kind (restored by the people who may manage the channel); project "delete items" trashes them.
- **copy-link** (`specs/shared/copy-link.spec.md`): pasted Notean links in messages are only auto-linked URLs here; no special chip.
- **comments**, **templates**, **attachments**: no overlap. Attachments in chat are out of scope.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Before starting, check that the mentions, notifications-inbox and trash specs are merged into `master`, and read their final code for the picker, token format, notification creation API and trash mechanism; adjust the names used below to match them. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` in `backend/` and `npm test` in `frontend/` and record the counts here.

### A. Data model

- [ ] A1. In the `create_schema` migration add `teams.chat_enabled` and the `chat_channels`, `chat_channel_members`, `chat_messages`, `chat_reactions`, `chat_read_states` tables with the indexes from 2.2 and the trash spec's soft-delete column(s) on `chat_channels`. Rebuild the dev and test databases; check that `db/schema.rb` contains only this change.
- [ ] A2. Add `chat` to `Team::FEATURES`; add `MESSAGE_MAX_LENGTH` and `MESSAGE_TOO_LONG` to `ContentLimits` / `limit_error_code`.
- [ ] A3. Add models `ChatChannel`, `ChatChannelMember`, `ChatMessage`, `ChatReaction`, `ChatReadState` with associations, validations and the trash spec's trashable behaviour on `ChatChannel`. Add fixtures for each scope. Model tests for name uniqueness, message limits and reaction cap.
- [ ] A4. Add `ChatAccess` with the methods from 2.2, plus its model tests.

### B. API

- [ ] B1. Add `ErrorCodes::Chat` and the strong params in `ApplicationController`; permit `chat_enabled` in `update_team_features_params`.
- [ ] B2. `ChatChannelsController` index, show, create, update, destroy (to Trash), leave, read, with routes. Controller tests including permissions per role, feature-off 403, project filtering, unread counts and a query-count test for index.
- [ ] B3. `ChatMessagesController` index (`before`, `around`), create, update, destroy, with routes and tests (pagination, permissions, query count).
- [ ] B4. `ChatReactionsController` create and destroy, with tests (uniqueness, cap, invalid emoji).
- [ ] B5. `GiphyClient` and `ChatGifsController`; GIF message creation in `ChatMessagesController#create` through `GiphyClient`; rack-attack throttle `chat/gifs`. Tests with a stubbed client.
- [ ] B6. Mention notifications on message create, edit and delete through the notifications-inbox spec's API, limited to users from `ChatAccess.user_ids_who_can_see`. Tests.
- [ ] B7. `MembershipRemoval` drops chat members and read states; `ProjectsController#destroy` trashes or converts channels per mode; tests for both.

### C. Realtime

- [ ] C1. `ChatCable` (subscribe rules, `typing` action) and channel tests.
- [ ] C2. `ChatBroadcast` and the broadcast calls in the chat controllers (after `render`), plus `channels_changed` from project member changes, `ProjectAccessCleanup`, role changes and project deletion. Tests that each event reaches exactly the users who can see the channel.

### D. Frontend data layer

- [ ] D1. Add `npm` dependencies `emoji-picker-element` and `emoji-picker-element-data`, the asset glob for the English data file in `angular.json`, and the Giphy hosts in the CSP in `src/index.html`. Record the installed versions in 2.1.
- [ ] D2. `TeamFeature` gains `'chat'`, `mapTeam` maps it, `routeFeature` maps `chat`, Manage team gets the Chat toggle, `AppRoutes.CHAT`. Update `featureGuard` and `routeFeature` specs and `testing/teamFixtures.ts`.
- [ ] D3. `models/chat.model.ts`, `config/errorCodes/chat.ts` (registered in `index.ts`), `ChatService` with `map*` functions, and its spec.
- [ ] D4. `ChatCableService` (connected from `DashboardComponent`, team switch, `disconnect()`), with a spec for event dispatch.
- [ ] D5. `ChatListService` (order, open state, project filter, unread bumping, total, reload on `channelsChanged$` and `membersChanged$`) and `RecentReactionsService`, with specs.

### E. Sidebar and channel management

- [ ] E1. `SidebarChatComponent` and its placement right below Home in `DashboardSidebarComponent` (only when `features.chat`), with spec.
- [ ] E2. `ChatMemberPickerComponent` and `CreateChatChannelDialogComponent` (kinds and projects limited to what the user may create).
- [ ] E3. `ChatChannelSettingsDialogComponent` (rename, GIF rating, members, delete via confirm dialog).

### F. Chat page

- [ ] F1. Dashboard route `chat/:id` with `featureGuard('chat')`, `ChatPageComponent` (load, 404 and removal redirects with toasts, header, leave, settings, read marking with tab visibility, `?message=` support).
- [ ] F2. `ChatMessageListComponent` (initial position at first unread, "New" divider, older pages on scroll keeping position, grouping, typing line).
- [ ] F3. `ChatMessageBodyComponent` (safe text, line breaks, auto-links, mention and item chips from the mentions spec) with a spec covering injection attempts.
- [ ] F4. `ChatMessageComponent` (GIF rendering, "(edited)", hover actions, inline edit, delete confirm).
- [ ] F5. `EmojiPickerComponent` (overlay, self-hosted `dataSource`, translated `i18n`) and `ChatReactionsComponent` (chips, tooltip, recent six, **+**).
- [ ] F6. `GifPickerComponent` (debounced search, grid, load more, attribution, unavailable state).
- [ ] F7. `ChatComposerComponent` (Enter/Shift+Enter, emoji, `@` picker from the mentions spec, `/gif`, typing pings, keeps text on failure) with a spec.
- [ ] F8. Live updates on the page: apply message, reaction and typing events for the open channel.

### G. Translations and docs

- [ ] G1. All new `PHRASES` keys and `ERRORS.CHAT.*` in `config/phrases.ts` and every translation file.
- [ ] G2. Update the root `CLAUDE.md` (chat feature flag, routes, `ChatCable`, `ChatAccess`, the new services and the emoji/GIF setup, the CSP change) and the README if it lists features or setup (the `giphy.api_key` credential).

### Z. Wrap-up

- [ ] Z1. Backend: `bin/rails test`, `bin/rubocop`, `bin/brakeman`. Frontend: `npm test`, `npm run build` (no budget errors, emoji picker not in the initial bundle).
- [ ] Z2. Manual check in the running app with two users in two browsers: owner creates a team-wide, a project and a user-scoped channel; a regular member sees only the right ones and no Create row; messages, edits, deletes, reactions, typing and unread counts update live in both; `/gif` sends a GIF; `@` picks a user (who gets an inbox entry) and an item; reorder the sidebar list; delete a channel (the other user is sent Home) and restore it from Trash; turn chat off in Manage team and see it disappear for the other user.
