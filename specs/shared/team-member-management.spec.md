# Team member management — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Teams have roles (`user`, `admin`, `owner`), but nothing in the app changes them after joining. Nobody can be removed, members can't leave, and the owner can't hand the team over. This spec adds four actions: remove a member, change a role, leave a team and transfer ownership.

A former member's work stays in the team under their last nickname. Memberships are therefore soft-removed, not deleted.

- **Users:**
  - The owner, who manages everyone.
  - Admins, who can remove regular users.
  - Any member, who can leave a team.
- **Usage:**
  - **Manage team > Members** (admin and owner only, as today). Each member row gets a menu (`app-menu-button`) with the actions the viewer is allowed to use on that member:
    - *Make admin* or *Make user* (owner only, on non-owners).
    - *Transfer ownership* (owner only, on non-owners).
    - *Remove from team* (owner on anyone but themselves; admin on users only).

    Rows with no allowed actions show no menu. Every action asks for confirmation in `app-confirm-dialog`:
    - "Remove X from the team?"
    - "Make X an admin?" or "Make X a regular member?"
    - "Make X the owner? You will become an admin."

    On success the list updates in place and a toast confirms. On error a translated message shows in the page's alert area.
  - **Switch team** page: each team row gets a *Leave team* action, confirmed with "Leave <team name>?". On success the row disappears. If it was the active team, the app clears the team and goes to team selection, as it does when there's no team. For the owner, *Leave team* is disabled and shows the tooltip "Transfer ownership before leaving".
  - **Removed while online:** a removed member with the app open is sent to team selection right away, with the toast "You were removed from <team name>", if that team was active. If it wasn't active, it just disappears from their team list the next time it loads.
  - **Former members in content:** creator avatars and names, assignee chips, project owners and member lists of past content keep showing the former member's last nickname and avatar. Lists of current members (Manage team, assignee pickers, project member pickers, mentions of who's editing) show active members only.
- **Rules:**
  - Nobody can remove the owner, and the owner can't leave. The owner must transfer ownership first, and to get rid of the team they delete it.
  - Admins can remove users but not other admins. Only the owner changes roles, and only between `user` and `admin`.
  - Ownership can only be transferred to an active member. The old owner becomes `admin`. There is always exactly one owner.
  - Removing or leaving soft-removes the membership by setting `removed_at`. In the same transaction:
    - Every project in the team owned by that user moves to the team owner (`owner_user_id`).
    - Their `project_members` rows in the team's projects are deleted.
    - Their `ticket_assignees` rows on the team's tickets are deleted.
    - Their favorites in the team are deleted.
    - Any editing presence they hold in the team is stopped.
  - A former member has no access at all: every membership check counts only active memberships.
  - A former member can rejoin with the team code and password. Joining restores their old membership row: `removed_at` is cleared, the role is reset to `user`, the nickname is set to the one entered, and `last_active_at` is updated.
  - A former member's nickname stays reserved in the team. The nickname uniqueness check still counts removed rows, so old content is never confused with a newcomer. When they rejoin, their own old row doesn't block the nickname they choose.
- **Out of scope:**
  - Inviting people any way other than the team code and password.
  - A list of former members, or undoing a removal. They rejoin instead.
  - Deleting a user account. That's in `delete-account.spec.md`, which builds on this soft removal.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies. Uses ActionCable's existing `TeamChannel`, plus `app-menu-button`, `app-confirm-dialog`, the toast service and `appTooltip` on the frontend.

## 2.2 Structure

**Data model:** edit `backend/db/migrate/20261025120000_create_schema.rb` (no new migration file) and rebuild the dev and test databases:
- `memberships.removed_at` (datetime, null).
- An index on `[team_id, removed_at]`.

**Models:**
- `Membership`:
  - Scopes `active` (`removed_at: nil`) and `removed`.
  - Instance methods `removed?`, `remove!` (sets `removed_at` and runs `MembershipRemoval`) and `restore!(nickname:)`.
  - The nickname uniqueness validation keeps its `scope: :team_id` with no condition, so removed rows still reserve their names.
- `User`:
  - `has_many :memberships, -> { active }`.
  - `has_many :all_memberships, class_name: "Membership"`.
  - `has_many :teams, through: :memberships`.
- `Team`:
  - `has_many :memberships, -> { active }, dependent: :destroy`.
  - `has_many :all_memberships, class_name: "Membership"`, with `dependent: :destroy` moved here so team deletion removes every row.
  - `has_many :users, through: :memberships`.

  Making the default associations active-only means every existing check keeps working as active-only without editing each call site:
  - `authorize_team_member!`, `membership_for` and `active_membership`.
  - `ProjectAccess`.
  - `TeamChannel` and `EditingChannel`.
  - `ProjectMember`, `TicketAssignee` and `Project` validations.
  - `BoardScoped`.
- New `backend/app/models/membership_removal.rb` (plain Ruby class, like `ProjectAccessCleanup`): `MembershipRemoval.apply(membership)` does the reassignments and deletions listed in Part 1 inside a transaction, then broadcasts on `TeamChannel`.

**Nicknames for former members:** `team_nicknames` in `ApplicationController` reads `@team.all_memberships.pluck(:user_id, :nickname)`, so `member_json` keeps returning the last nickname for former members. `EditingStatus.nickname_for` stays on the active `memberships`.

**API:** new routes, all under `teams/:code`, with errors in `ErrorCodes::Teams`.

| Method and path | Who | Body | Response |
|---|---|---|---|
| `DELETE /teams/:code/members/:user_id` | owner; admin (target must be a `user`) | none | `{ members: [...] }` (active members, same shape as `GET members`) |
| `PATCH /teams/:code/members/:user_id/role` | owner | `{ membership: { role: "admin" \| "user" } }` | `{ members: [...] }` |
| `POST /teams/:code/transfer_ownership` | owner | `{ membership: { user_id } }` | `{ members: [...], role: "admin" }` |
| `POST /teams/:code/leave` | any non-owner member | none | `204` |

New error codes in `backend/app/errors/error_codes/teams.rb`:
- `MEMBER_NOT_FOUND` (404): the target isn't an active member.
- `CANNOT_REMOVE_OWNER` (422).
- `CANNOT_MANAGE_ADMIN` (403): an admin targeting an admin.
- `ROLE_INVALID` (422): anything but `admin` or `user`, or the target is the owner.
- `OWNER_CANNOT_LEAVE` (422).
- `CANNOT_TRANSFER_TO_SELF` (422).

Strong params go in `ApplicationController`: `update_member_role_params` and `transfer_ownership_params`. The new actions go in a new `MembersController` (one controller per resource) with the usual chain: `authenticate_user!`, `set_team` (param `code`, like `TeamsController#team_code`), `authorize_team_member!`. The existing `GET /teams/:code/members` stays in `TeamsController`.

`ActionsController#join_team` uses `@team.all_memberships.find_or_initialize_by(user: current_user)`:
- A removed row is restored with `restore!(nickname: team_params[:nickname])`.
- An active row behaves as today.
- A new row is created as today.

**Realtime:** after removal, `MembershipRemoval` broadcasts `{ type: "member_removed", user_id:, team: team_json(team) }` on `TeamChannel.stream_name(team)`. Leaving broadcasts the same event, so the leaving member's other tabs react too. After a role change or transfer, `{ type: "members_changed" }` is broadcast so open Manage team pages reload their member list. The removed user's own subscription is not force-closed; the app reacts to the event and unsubscribes.

**Frontend:**
- `TeamService`: `removeMember`, `updateMemberRole`, `transferOwnership` and `leaveTeam`, each returning `Result<T, E>` through `apiRequest`. They update stored role state when the current user's own role changes (on a transfer the current user becomes `admin`).
- `models/team.model.ts`: the member result types.
- `config/errorCodes/teams.ts`: the new codes.
- `TeamChannelService`: handles `member_removed`. If `user_id` is the current user and `team.code` is the active team, it calls `TeamService` to clear the team, shows the toast and navigates to `AppRoutes.TEAM_SELECTION`. It also emits `members_changed` on an observable that `ManageTeamComponent` subscribes to.
- `pages/manage-team`: a row menu per member, with the confirm dialog and toasts described in Part 1. Actions are computed from the viewer's role and the target's role.
- `pages/switch-team`: a *Leave team* action per row, disabled for the owner with the tooltip.
- i18n: new `PHRASES` keys plus every translation file, for the action labels, confirm messages, toasts, the tooltip and `ERRORS.TEAMS.<CODE>` for each new code.

## 2.3 Decisions
1. **One spec or four?** One. The actions share a screen, permissions and role rules. (2026-10-26)
2. **Who removes members?** The owner removes anyone. Admins remove users only. Nobody removes the owner. Rejected: owner only, and admins removing admins. (2026-10-26)
3. **Who changes roles?** The owner only, between `user` and `admin`. Rejected: letting admins promote. (2026-10-26)
4. **Where does a regular member leave?** On the Switch team page, per team row. Rejected: the Profile page, and opening Manage team to everyone. (2026-10-26)
5. **Projects owned by the person leaving?** They move to the team owner automatically, so removal is never blocked. Rejected: blocking until reassigned, and moving to whoever did the removal. (2026-10-26)
6. **How do former members appear in content?** With their last nickname. Memberships are soft-removed with `removed_at`. Rejected: hard delete with a "Former member" label. (2026-10-26)
7. **A removed member who is online?** Instant redirect and toast through a `member_removed` broadcast on `TeamChannel`. Rejected: waiting for the next 403. (2026-10-26)
8. **Transfer ownership?** The old owner becomes admin, confirmed in the plain confirm dialog. Rejected: typing the team name, and demoting the old owner to user. (2026-10-26)
9. **Can former members rejoin?** Yes. Joining restores their old row as `user` with the nickname they enter. Rejected: blocking rejoin. (2026-10-26)
10. **Are a former member's nicknames reserved?** Yes. Uniqueness counts removed rows. Rejected: freeing the name. (2026-10-26)
11. **Can the owner leave?** Only after transferring ownership. Rejected: leaving deletes the team when the owner is alone. (2026-10-26)
12. **How is "active only" enforced?** Through the default `memberships` associations scoped to `active`, with `all_memberships` for nicknames, rejoin and team deletion. This avoids editing every membership check and missing one. (2026-10-26, implementation choice recorded while writing the spec)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: backend 397 tests, frontend 595 tests (run both to confirm).

### A. Data model
- [ ] A1. Add `removed_at` and the `[team_id, removed_at]` index to `memberships` in `backend/db/migrate/20261025120000_create_schema.rb`. Rebuild the dev and test databases (`bin/rails db:drop db:create db:migrate`, and the same with `RAILS_ENV=test`) and check `db/schema.rb` only gained these lines.
- [ ] A2. In `Membership`, add the `active` and `removed` scopes, `removed?` and `restore!(nickname:)`. Model tests: `restore!` clears `removed_at`, resets the role to `user`, sets the nickname. A removed row's nickname still blocks a new member's identical nickname. The user's own removed row doesn't block their restore with the same nickname.
- [ ] A3. Scope `has_many :memberships` to `active` and add `all_memberships` on `User` and `Team` as in 2.2 (team deletion destroys all rows). Model tests: `team.users` and `user.teams` exclude removed memberships, and destroying a team removes removed rows too.
- [ ] A4. Add `MembershipRemoval.apply` in `backend/app/models/membership_removal.rb` covering everything in Part 1's removal rule, in one transaction. Model tests for each effect: project ownership moves to the team owner, project member rows, assignees and favorites are deleted, and `removed_at` is set.

### B. API
- [ ] B1. Switch `team_nicknames` in `ApplicationController` to `all_memberships`. Add a controller test: a page created by a removed member still returns their nickname in `creator`.
- [ ] B2. Add the four routes, the new `MembersController`, the strong params in `ApplicationController` and the six error codes in `error_codes/teams.rb`. Controller tests for every permission row in 2.2, including:
  - Admin removes a user (ok) and admin removes an admin (`CANNOT_MANAGE_ADMIN`).
  - Removing the owner (`CANNOT_REMOVE_OWNER`) and an unknown user (`MEMBER_NOT_FOUND`).
  - Role changes by a non-owner (403) and `ROLE_INVALID`.
  - Transfer: the old owner becomes admin and exactly one owner remains; transfer to self.
  - Leave as a user (204) and as the owner (`OWNER_CANNOT_LEAVE`).
- [ ] B3. Check that a removed member gets 403 `NOT_TEAM_MEMBER` on a team endpoint, can't subscribe to `TeamChannel` or an editing channel, and doesn't appear in `GET members`. Add a test for each.
- [ ] B4. Make `ActionsController#join_team` restore removed memberships as in 2.2. Tests: rejoin restores the row (same id) as `user` with the new nickname, and an active member joining again behaves as today.
- [ ] B5. Broadcast `member_removed` (remove and leave) and `members_changed` (role change and transfer). Channel or controller tests assert the broadcasts with `assert_broadcast_on`.
- [ ] B6. Add a query-count test for `DELETE /teams/:code/members/:user_id` with 1 and 10 members, since it renders the member list.

### C. Frontend data layer
- [ ] C1. Add the new codes to `frontend/src/app/config/errorCodes/teams.ts` and the result types to `models/team.model.ts`.
- [ ] C2. Add `removeMember`, `updateMemberRole`, `transferOwnership` and `leaveTeam` to `TeamService`, and update the stored role on transfer. Spec tests for success and failure mapping and the role update.
- [ ] C3. Handle `member_removed` and `members_changed` in `TeamChannelService`. Spec tests: own removal from the active team clears the team, toasts and navigates; another user's removal does nothing to the session; `members_changed` emits.

### D. Screens
- [ ] D1. Manage team: a member row menu with only the allowed actions, the confirm dialogs, list updates and toasts, and a reload on `members_changed`. Component spec tests for which actions show for owner and admin viewers against user, admin and owner targets.
- [ ] D2. Switch team: a *Leave team* action per row, disabled with a tooltip for the owner, with confirm, row removal, and leaving the active team going to team selection. Component spec tests.
- [ ] D3. Add all new `PHRASES` keys and translations in every file in `public/assets/translations/`.

### E. Docs
- [ ] E1. Update the root `CLAUDE.md`:
  - Backend Models: memberships are soft-removed with `removed_at`, and the default `memberships` associations are active-only.
  - Routes: the member endpoints.
  - Channels: the `member_removed` and `members_changed` events.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md`.
- [ ] Z2. Manual check in the running app, with two browsers (owner and member):
  - The owner promotes the member to admin, then demotes them.
  - The owner removes the member, whose app jumps to team selection with the toast.
  - The member rejoins with code and password, and their old pages show them as creator again.
  - The owner transfers ownership to the member and becomes admin.
  - The old owner leaves from Switch team.
