# Notifications inbox (Activity) — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-28

# Part 1 — Business logic and usage

An **Activity** section at the top of the Home page tells each user what other people did that concerns them: they were assigned to or removed from a ticket, someone changed or deleted an item they own, someone commented on an item they follow, or someone mentioned them. New notifications arrive live, and an unread count shows next to Home in the sidebar. In code the concept is called **Notification**; only the UI says "Activity".

- **Users:** every member of a team, in their active team. The inbox shows the active team's notifications only.

- **Events** (each creates one notification per recipient; the person who acted is never notified about their own action):
  - **Assigned** — someone assigned you to a ticket (single assign or the bulk *Add assignee* action).
  - **Unassigned** — someone removed you from a ticket (single or bulk *Remove assignee*).
  - **Item changed** — someone else changed an item you own:
    - Ticket: title, description, status (moved to another column or to/from the backlog, single or bulk), priority. Reordering within the same column or backlog and assignee changes don't count.
    - Page or diagram: title or content. Folder moves and project changes don't count.
  - **Item deleted** — someone else deleted an item you own (ticket, single or bulk; page; diagram).
  - **Commented** — someone commented on an item you own or have already commented on. Created by the comments spec through the shared notifier.
  - **Mentioned** — someone `@`-mentioned you. Created by the mentions spec through the shared notifier.

- **Owner** means: the item's creator (`created_by_user_id`), plus, for tickets, every assignee.

- **Usage:**
  1. Home shows **Activity** first, above Favorites and My Work. It is always shown (no setting).
  2. A toggle switches between **All** and **Unread**; a **Mark all read** button marks every notification in the team read (disabled when the unread count is 0).
  3. Each row shows the actor's avatar and nickname, a sentence for the event ("assigned you to", "removed you from", "changed", "deleted", "commented on", "mentioned you in"), the item's type icon and title, a relative time (`relativeDate`), and an unread dot. Item changed rows also list what changed (e.g. "title, status"). Commented and mentioned rows show a short plain-text excerpt.
  4. Clicking a row marks it read and opens the item: a ticket opens its popup on its board's Kanban tab (List tab when it is in the backlog), a page or diagram opens its detail. Item deleted rows are not clickable; clicking only marks them read.
  5. Each row has an icon button (tooltip "Mark as read" / "Mark as unread") that toggles its read state without opening it.
  6. Newest first, 50 at a time, ending with `app-load-more` while more exist.
  7. Loading shows the same loading state as My Work; an empty list shows "No activity yet" (All) or "You're all caught up" (Unread); a failed load shows the translated error.
  8. The sidebar's Home item shows a count badge while the active team has unread notifications (shown as "99+" above 99). It is hidden when the count is 0 and in the collapsed sidebar shows as a dot.
  9. New and updated notifications appear at the top of the list and update the badge live, in every open tab. Marking read in one tab updates the others.

- **Rules:**
  - Nobody is notified about an item they can't see: recipients must be active members of the item's team, able to see its project (`ProjectAccess`), with the item's feature turned on, and never the actor.
  - Visibility is also checked when reading: the list and unread count only include notifications whose item the user can see now, with its feature on. Losing access hides them; regaining it brings them back. Former team members see nothing of that team.
  - **Collapsing:** while an *item changed* notification for the same recipient and item is still unread, a further change updates it instead of creating a new row: latest actor, merged changed fields, event count + 1, time bumped to now, moved to the top. Once read, the next change creates a new row. No other kind collapses.
  - **Deletion:** when an item is deleted, its owners (except the actor) get an *item deleted* notification that keeps the item's title as text; every earlier notification about that item is deleted. Deleting a board deletes its tickets' notifications without sending item deleted notifications (only explicit ticket deletes send them). Deleting a team deletes its notifications. Deleting an account deletes the user's own notifications; notifications they caused keep their last nickname as actor.
  - **Retention:** read notifications older than 30 days (by `read_at`) are deleted; unread ones are kept. The purge runs when the user loads their inbox list.
  - Reading or toggling only affects the current user's own notifications.

- **Out of scope:**
  - Muting, per-type preferences or email/push delivery: a later spec if wanted.
  - Notifications for project or team changes (added to a project, role changes, removal).
  - Creating comment and mention notifications: the comments and mentions specs call this spec's notifier.
  - Filtering by the header project selector: the inbox always shows the whole active team.
  - Cross-team inbox.

### Related specs

- **comments** (`comments.spec.md`): `CommentsController#create` (the single comment creation point, pin creation included) calls `Notifier.commented(item, comment_author, recipients:, excerpt:)` with the commented item (the `Ticket`, `Page`, or the `Diagram` of a pin) and the users who already commented on that thread. The notifier adds the owners itself.
- **mentions** (`mentions.spec.md`): calls `Notifier.mentioned(item, actor, users, excerpt:)` directly (no `ActiveSupport::Notifications` event) for newly mentioned users in comments, ticket descriptions, page content and project descriptions. For a comment the item is the comment's ticket, page or diagram. A user both mentioned and otherwise notified by the same comment gets only the mention (the mentions spec calls `mentioned` first and passes those users as `except:` to `commented`). Because project descriptions can mention people, `ITEM_TYPES` also includes `Project` (kind `mentioned` only): its visibility is its own id in `visible_project_ids`, with no feature flag, and it links to the project detail route.
- **trash** (`trash.spec.md`): a delete becomes a move to the trash. Moving an item to the trash calls `Notifier.item_deleted` / `items_deleted` exactly where this spec wraps today's destroys (earlier rows about the item are deleted, owners get an *item deleted* row), and the row reads "moved to trash" instead of "deleted". Restoring sends nothing and brings nothing back. Because the trash spec adds a `default_scope` that hides trashed rows, the raw `LEFT JOIN`s in `visible_to` must also skip rows whose `trash_entry_id` is set, and purging an item deletes its notifications (the `dependent: :delete_all` association must be reached with `unscoped`). Whichever of the two specs is merged second wires this.
- **Implementation order** (decided 2026-10-28): comments, then this spec, then mentions. This spec therefore adds the `Notifier.commented` call to the already merged `CommentsController#create` itself.
- **notifications** link to items with the same routes as **copy-link** and favourites; nothing else is shared.
- **attachments, templates, chat**: no interaction. Chat may later reuse `NotificationChannel`.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies. Backend: ActiveRecord, ActionCable. Frontend: axios through `apiRequest`, `CableService`, ngx-translate, existing `app-avatar`, `app-icon`, `app-icon-button`, `app-load-more`, `relativeDate`, `favoriteTypeIcon`.

## 2.2 Structure

### Data model
New table `notifications`, added to the single `create_schema` migration (the project rebuilds the database instead of adding migrations):

| column | type | notes |
|---|---|---|
| `user_id` | bigint, FK users, not null | recipient |
| `team_id` | bigint, FK teams, not null | |
| `actor_user_id` | bigint, FK users, not null | who acted |
| `kind` | string, not null | `assigned`, `unassigned`, `item_changed`, `item_deleted`, `commented`, `mentioned` |
| `item_type` | string, not null | `Ticket`, `Page`, `Diagram`, `Project` (mentions only) |
| `item_id` | bigint, null | null for `item_deleted` |
| `item_title` | string, not null | snapshot, refreshed when collapsing |
| `board_id` | bigint, null, no FK | tickets only, for the link and visibility |
| `project_id` | bigint, null, no FK | snapshot, used for visibility only when the item is gone |
| `changed_fields` | string array, default `[]`, not null | `title`, `description`, `content`, `status`, `priority` |
| `excerpt` | string, null | plain text, up to 200 chars |
| `event_count` | integer, default 1, not null | |
| `read_at` | datetime, null | |
| `occurred_at` | datetime, not null | ordering key |
| timestamps | | |

Indexes: `[user_id, team_id, occurred_at]`, `[user_id, team_id, read_at]`, `[item_type, item_id]`, partial unique `[user_id, item_type, item_id]` where `kind = 'item_changed' AND read_at IS NULL` (guards collapsing).

Model `Notification`: `KINDS`, `ITEM_TYPES`, `FEATURES = { "Ticket" => :boards, "Page" => :pages, "Diagram" => :diagrams }`, `belongs_to :user, :team, :actor (User)`, `belongs_to :item, polymorphic: true, optional: true`, scopes `unread`, `for(user, team)`, `visible_to(project_access, team)` and `RETENTION = 30.days`.

`visible_to` filters in SQL: `item_type` in the team's enabled feature types, and a project id that is null or in `project_access.visible_project_ids`, where the project id is `COALESCE(pages.project_id, diagrams.project_id, boards.project_id, notifications.project_id)` via LEFT JOINs on `pages`/`diagrams` (by `item_type`/`item_id`) and `boards` (by `board_id`). Live items use their current project; deleted items use the snapshot. Tickets take the current board's project.

Associations: `Ticket`, `Page`, `Diagram`: `has_many :notifications, as: :item, dependent: :delete_all`. `Team`: `has_many :notifications, dependent: :delete_all`. `User`: `has_many :notifications, dependent: :delete_all`; `User#anonymise!` also deletes `notifications`.

### Notifier (backend, `app/models/notifier.rb`)
Plain Ruby class, the only place notifications are created. Every public method resolves recipients, drops the actor and anyone who can't see the item (`ProjectAccess.users_who_can_see(item)` intersected with active members, feature on), writes rows, then broadcasts each recipient's change.

- `Notifier.owners(item)` → creator plus, for tickets, assignees.
- `Notifier.assigned(ticket, actor, users)` / `Notifier.unassigned(ticket, actor, users)`.
- `Notifier.item_changed(item, actor, fields)` → owners; collapses into the unread row for the same recipient and item (`event_count + 1`, union of fields, new actor, `occurred_at` now, `item_title` refreshed), otherwise inserts.
- `Notifier.item_deleted(item, actor) { ... }` → captures owners, title, `board_id`, project id and visible recipients before yielding; the block destroys the item (dependent rows go with it); then inserts `item_deleted` rows with `item_id` null. Takes an array of tickets for bulk delete too (`Notifier.items_deleted(tickets, actor) { ... }`).
- `Notifier.commented(item, actor, recipients:, excerpt:, except: [])` → owners ∪ `recipients`, minus `except`.
- `Notifier.mentioned(item, actor, users, excerpt:)`.

Excerpts are cut to 200 characters by the notifier. Bulk calls insert with `insert_all` and one broadcast per recipient, so query counts don't grow per ticket.

`ProjectAccess.users_who_can_see(board)` is generalised to `users_who_can_see(record)` using `project_id_of(record)`; `BoardChannel` keeps calling it with the board.

Hook points (calls go after the successful save, next to the existing broadcasts):
- `TicketAssigneesController#create` (only when the assignee is new) and `#destroy`.
- `TicketsController#update`: fields from `title`, `description`, `column_id`/`to_backlog` (status, only when the column actually changes), `priority_id`, compared before save. `#destroy` and `#bulk_destroy` wrap the destroy in `Notifier.item_deleted` / `items_deleted`. `#bulk_update`: column moves → `item_changed(status)` for each ticket whose column changed; add/remove assignee → `assigned`/`unassigned` for tickets where it actually changed.
- `PagesController#update` / `DiagramsController#update`: `title` (when changed) and `content` (when changed). `#destroy` wraps in `Notifier.item_deleted`.

### API
Routes under `teams/:team_code` (`NotificationsController`, `authenticate_user!`, `set_team`, `authorize_team_member!`; no `FeatureGated`, since disabled types are filtered out):

- `GET /teams/:team_code/notifications?offset=&unread=true` → `{ notifications: [...], has_more, unread_count }`. First deletes the current user's notifications read more than `RETENTION` ago. Ordered `occurred_at DESC, id DESC`, `paginate`.
- `GET /teams/:team_code/notifications/unread_count` → `{ unread_count }`.
- `PATCH /teams/:team_code/notifications/:id` with `{ notification: { read: true|false } }` → `{ notification, unread_count }`. Unknown, hidden or other users' ids → 404 `NOTIFICATION_NOT_FOUND`.
- `POST /teams/:team_code/notifications/read_all` → `{ unread_count: 0 }`.

Notification JSON (`notification_json`): `id, kind, item_type, item_id, item_title, board_id, in_backlog (tickets: column_id null), changed_fields, excerpt, event_count, read, occurred_at, actor (member_json, nickname from all_memberships)`. Preloads actors, avatars and ticket columns so the list has a constant query count.

Error codes: new module `ErrorCodes::Notifications` with `NOTIFICATION_NOT_FOUND`; strong params `update_notification_params` in `ApplicationController`.

### Channel
`NotificationChannel` (no params) streams `notifications:<current_user.id>`. Messages:
- `{ type: "notification_upserted", team_code, notification, unread_count }` — new or collapsed row.
- `{ type: "notifications_read", team_code, ids, read, unread_count }` — from `PATCH` (one id) and `read_all` (`ids: "all"`).
- `{ type: "notification_removed", team_code, ids, unread_count }` — rows deleted because their item was deleted.

`unread_count` is the visible unread count of that team for that user. Broadcasts go after the render, like `BoardBroadcast`, through a small `NotificationBroadcast` class.

### Frontend
- `models/notification.model.ts`: `Notification`, `NotificationKind`, `NotificationPage` (`notifications`, `hasMore`, `unreadCount`).
- `config/errorCodes/notifications.ts` plus `ERRORS.NOTIFICATIONS.NOTIFICATION_NOT_FOUND` in every translation file.
- `services/notification.service.ts` (`NotificationService`): `list(teamCode, offset, unreadOnly)`, `unreadCount(teamCode)`, `setRead(teamCode, id, read)`, `readAll(teamCode)`, `mapNotification`, all `Result<T, E>` via `apiRequest` and `teamPath`.
- `services/notification-channel.service.ts` (`NotificationChannelService`, root): `connect(teamCode)` subscribes `NotificationChannel` through `CableService` and loads the unread count; ignores messages for other teams; exposes `unreadCount$` (BehaviorSubject), `upserted$`, `read$`, `removed$`; `setUnreadCount(n)` for responses. `DashboardComponent` connects it next to `TeamChannelService` on team change and disconnects on destroy; `SessionService.clear()` resets the count.
- `utils/notificationRoute.ts`: route for a notification (pages/diagrams like `favoriteRoute`, tickets via `ticketRoute(boardId, itemId, inBacklog)`), null for `item_deleted`.
- `components/activity-inbox/` (`app-activity-inbox`): heading, All/Unread toggle, Mark all read, list, load more, empty/error states; applies channel events (prepend or move upserted rows, update read state, drop removed rows; in Unread view, rows marked read stay until reload).
- `components/activity-row/` (`app-activity-row`): one row; `@Input() notification`, `@Output() open`, `@Output() toggleRead`.
- `pages/dashboard/home/home.component.html`: `<app-activity-inbox>` first.
- `components/dashboard-sidebar/`: unread badge on the Home item from `unreadCount$`.
- `PHRASES` and all 11 translation files: `ACTIVITY`, `ACTIVITY_ALL`, `ACTIVITY_UNREAD`, `ACTIVITY_MARK_ALL_READ`, `ACTIVITY_MARK_READ`, `ACTIVITY_MARK_UNREAD`, `ACTIVITY_EMPTY`, `ACTIVITY_ALL_CAUGHT_UP`, one phrase per kind (`ACTIVITY_ASSIGNED`, `ACTIVITY_UNASSIGNED`, `ACTIVITY_CHANGED`, `ACTIVITY_DELETED`, `ACTIVITY_COMMENTED`, `ACTIVITY_MENTIONED`), `ACTIVITY_EVENT_COUNT` (e.g. "+{{count}} more"), and the field names (`ACTIVITY_FIELD_TITLE`, `_DESCRIPTION`, `_CONTENT`, `_STATUS`, `_PRIORITY`).

## 2.3 Decisions

1. **Events?** Assigned, unassigned, item changed, item deleted, commented, mentioned. Project and team changes rejected for now.
2. **What is "owned"?** Creator plus ticket assignees. Creator-only rejected (assignees miss ticket changes); contributors rejected (too noisy).
3. **Repeated edits?** Collapse into the unread *item changed* row. One row per change rejected (page autosave floods the inbox); a time window rejected as harder to explain.
4. **Unread badge?** On the sidebar Home item. Header bell rejected.
5. **Read state?** Clicking marks read, *Mark all read*, and a per-row read/unread toggle.
6. **Live?** Yes, through a per-user `NotificationChannel`. Load-on-visit rejected (stale badge).
7. **Retention?** Read notifications deleted 30 days after reading; unread kept.
8. **Purge mechanism?** On inbox list load, for the current user. A rake task + cron and Solid Queue were rejected to avoid new infrastructure (the trash spec decides its own purge).
9. **Muting / preferences?** Not in this spec.
10. **Ticket changes that count?** Title, description, status (incl. bulk), priority, deletion. Reorders and assignee changes excluded.
11. **Comment recipients?** Owners plus prior commenters on that thread.
12. **Team scope?** Active team only, ignoring the project selector.
13. **Item deleted?** Owners get an *item deleted* notification with the title as text; earlier ones about the item are deleted. Silent deletion and keeping unclickable rows were rejected.
14. **Lost access?** Filter at read time; no cleanup hooks. Deleting on access loss rejected (more code paths, permanent).
15. **Placement?** Top of Home, always shown, no setting.
16. **List?** 50 at a time with load more, All/Unread toggle.
17. **Page and diagram changes that count?** Title, content, deletion. Moves and project changes excluded.
18. **UI name?** "Activity". Code name: `Notification` (model, table, API, `NotificationChannel`, `NotificationService`). "Activity" in code rejected as it reads like a team-wide feed.
19. **Bulk actions?** Notify like the single actions.
20. **Board deletion** deletes its tickets' notifications without item deleted notices (decided while writing; confirm in review).
21. **Mention and comment by the same comment** → only the mention (decided while writing; confirm in review).

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` in `backend/` and `npm test` in `frontend/` and note the counts here.

### A. Data model
- [ ] A1. Add the `notifications` table with its columns, foreign keys and indexes to the `create_schema` migration and rebuild the dev and test databases; update `db/schema.rb`.
- [ ] A2. Add `app/models/notification.rb` (constants, associations, scopes `unread`, `for`, `visible_to`) and the `notifications` associations on `Ticket`, `Page`, `Diagram`, `Team` and `User`; make `User#anonymise!` delete the user's notifications.
- [ ] A3. Fixtures `test/fixtures/notifications.yml` and `test/models/notification_test.rb`: `visible_to` hides items in hidden projects, disabled features and deleted items whose snapshot project is hidden, and follows a ticket's board project change.

### B. Notifier and broadcasts
- [ ] B1. Generalise `ProjectAccess.users_who_can_see` to any item; keep `BoardChannel` working.
- [ ] B2. Add `NotificationChannel` and `NotificationBroadcast`; `test/channels/notification_channel_test.rb`.
- [ ] B3. Add `app/models/notifier.rb` with `owners`, `assigned`, `unassigned`, `item_changed` (collapsing), `item_deleted`/`items_deleted`, `commented`, `mentioned`.
- [ ] B4. `test/models/notifier_test.rb`: actor excluded, hidden-project and disabled-feature recipients skipped, former members skipped, collapsing merges fields and count and stops after read, deletion removes earlier rows and creates `item_deleted` rows, `commented` merges owners and recipients minus `except`, broadcasts sent with the right `unread_count`.

### C. Hooks in existing controllers
- [ ] C1. `TicketAssigneesController#create`/`#destroy` call `assigned`/`unassigned`; tests.
- [ ] C2. `TicketsController#update` calls `item_changed` with the changed fields; `#destroy` and `#bulk_destroy` use `item_deleted`/`items_deleted`; `#bulk_update` notifies moves and assignee changes. Tests, including unchanged query counts for bulk actions with 1 and 10 tickets.
- [ ] C3. `PagesController` and `DiagramsController` `#update` and `#destroy` hooks; tests.

### D. Notifications API
- [ ] D1. `ErrorCodes::Notifications`, routes, `update_notification_params`, `NotificationsController` (`index` with purge, `unread_count`, `update`, `read_all`) and `notification_json`.
- [ ] D2. `test/controllers/notifications_controller_test.rb`: ordering, pagination, `unread` filter, visibility filtering, purge of old read rows only, other users' and hidden ids 404, `read_all` only touches the current team, broadcasts on read, query count with 1 and 10 notifications.

### E. Frontend data layer
- [ ] E1. `notification.model.ts`, `config/errorCodes/notifications.ts`, `NotificationService` with `mapNotification`; spec.
- [ ] E2. `NotificationChannelService`, connected from `DashboardComponent` and reset by `SessionService.clear()`; spec covering other-team messages ignored and count updates.
- [ ] E3. `utils/notificationRoute.ts`; spec.

### F. Frontend UI
- [ ] F1. `PHRASES` keys and every translation file, including the error code.
- [ ] F2. `app-activity-row` component; spec for sentence, changed fields, event count, excerpt, unread dot and toggle.
- [ ] F3. `app-activity-inbox` component: loading, All/Unread, Mark all read, load more, empty/error states, live events, open (mark read + navigate); spec.
- [ ] F4. Add the inbox to the top of `HomeComponent`; update its spec.
- [ ] F5. Sidebar Home unread badge (expanded count, "99+", collapsed dot); spec.

### Z. Wrap-up
- [ ] Z1. Update `CLAUDE.md` (notifications model, `Notifier`, `NotificationChannel`, API routes, frontend services and components).
- [ ] Z2. Full test runs, build and lint, using the commands in `CLAUDE.md` (`bin/rails test`, `bin/rubocop`, `bin/brakeman`, `npm test`, `npm run build`).
- [ ] Z3. Manual check in the running app with two users in one team: B assigns A to a ticket, edits it twice, moves it, edits A's page; A sees live rows and the badge, the edits collapse, clicking opens the ticket and page, Mark all read clears the badge in two tabs; B deletes the ticket and A sees an unclickable deleted row; moving the page into a project A can't see hides its rows.
