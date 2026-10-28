require "test_helper"

class NotifierTest < ActiveSupport::TestCase
  include ActionCable::TestHelper

  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @owner, role: "owner", nickname: "Alice")
    @bob = create_member(@team, "Bob")
    @carol = create_member(@team, "Carol")
    @board = Board.create!(team: @team, creator: @owner, title: "Board")
    @ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @owner.id, title: "Bug", position: 0)
  end

  test "the actor is never notified" do
    Notifier.assigned(@ticket, @bob, [ @bob, @carol ])

    assert_equal [ @carol.id ], Notification.where(kind: "assigned").pluck(:user_id)
  end

  test "recipients who can't see the item's project are skipped" do
    secret = Project.create!(team: @team, name: "Secret", owner: @owner, creator: @owner)
    secret.project_members.create!(user: @carol)
    @board.update!(project: secret)

    Notifier.assigned(@ticket, @owner, [ @bob, @carol ])

    assert_equal [ @carol.id ], Notification.pluck(:user_id)
  end

  test "nobody is notified while the item's feature is off" do
    @team.update!(boards_enabled: false)

    Notifier.assigned(@ticket, @owner, [ @bob ])

    assert_equal 0, Notification.count
  end

  test "former members are skipped" do
    @bob.memberships.first.remove!

    Notifier.assigned(@ticket, @owner, [ @bob, @carol ])

    assert_equal [ @carol.id ], Notification.pluck(:user_id)
  end

  test "owners are the creator and the ticket's assignees" do
    @ticket.ticket_assignees.create!(user: @bob)

    assert_equal [ @owner.id, @bob.id ].sort, Notifier.owners(@ticket).sort
  end

  test "item changes collapse into the unread notification until it is read" do
    @ticket.ticket_assignees.create!(user: @bob)
    Notifier.item_changed(@ticket, @owner, [ "title" ])
    @ticket.update!(title: "Renamed")
    Notifier.item_changed(@ticket, @carol, [ "status", "title" ])

    notification = Notification.where(user: @bob).sole
    assert_equal %w[status title], notification.changed_fields
    assert_equal 2, notification.event_count
    assert_equal @carol.id, notification.actor_user_id
    assert_equal "Renamed", notification.item_title

    notification.update!(read_at: Time.current)
    Notifier.item_changed(@ticket, @carol, [ "priority" ])

    assert_equal 2, Notification.where(user: @bob).count
  end

  test "deleting an item drops earlier notifications and leaves an item deleted row" do
    @ticket.ticket_assignees.create!(user: @bob)
    Notifier.item_changed(@ticket, @carol, [ "title" ])
    assert_equal 2, Notification.count

    result = Notifier.item_deleted(@ticket, @carol) { @ticket.destroy! && :done }

    assert_equal :done, result
    assert_equal [ [ "item_deleted", nil, "Bug", @board.id ] ] * 2, Notification.order(:user_id).pluck(:kind, :item_id, :item_title, :board_id)
    assert_equal [ @owner.id, @bob.id ].sort, Notification.pluck(:user_id).sort
  end

  test "commented notifies owners and earlier commenters except the excluded users" do
    page = Page.create!(team: @team, creator: @owner, title: "Spec", content: "")
    dave = create_member(@team, "Dave")

    Notifier.commented(page, @bob, recipients: [ @carol, dave ], excerpt: "x" * 300, except: [ dave ])

    assert_equal [ @owner.id, @carol.id ].sort, Notification.pluck(:user_id).sort
    assert_equal 200, Notification.first.excerpt.length
  end

  test "mentioned in a project description is visible to project members only" do
    secret = Project.create!(team: @team, name: "Secret", owner: @owner, creator: @owner)

    Notifier.mentioned(secret, @owner, [ @bob ], excerpt: "Hi Bob")

    assert_equal 0, Notification.count
  end

  test "each recipient gets the notification with their unread count" do
    Notifier.assigned(@ticket, @owner, [ @bob ])

    assert_broadcasts NotificationChannel.stream_name(@bob), 1 do
      Notifier.assigned(@ticket, @owner, [ @bob ])
    end
    message = ::JSON.parse(broadcasts(NotificationChannel.stream_name(@bob)).last)
    assert_equal "notification_upserted", message["type"]
    assert_equal @team.code, message["team_code"]
    assert_equal 2, message["unread_count"]
    assert_equal "Alice", message["notification"]["actor"]["nickname"]
  end

  test "moving an item to the trash notifies its owners and restoring it sends nothing" do
    @ticket.ticket_assignees.create!(user: @bob)
    Notifier.item_changed(@ticket, @carol, [ "title" ])

    entries, = Notifier.item_deleted(@ticket, @carol) { Trash.move_tickets(@board, [ @ticket ], @carol) }

    assert_equal [ [ "item_deleted", nil ] ] * 2, Notification.pluck(:kind, :item_id)
    assert_no_difference -> { Notification.count } do
      Trash.restore(entries.first)
    end
  end

  test "trashing a folder or board passes straight through" do
    folder = Folder.create!(team: @team, creator: @owner, title: "Docs", item_type: "Page")

    entry = Notifier.item_deleted(folder, @bob) { Trash.move(folder, @bob) }

    assert_kind_of TrashEntry, entry
    assert_equal 0, Notification.count
  end
end
