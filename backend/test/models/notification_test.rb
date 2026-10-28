require "test_helper"

class NotificationTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @owner, role: "owner", nickname: "Alice")
    @member = create_member(@team, "Bob")
    @game = Project.create!(team: @team, name: "Game", owner: @owner, creator: @owner)
    @game.project_members.create!(user: @member)
    @secret = Project.create!(team: @team, name: "Secret", owner: @owner, creator: @owner)
  end

  test "visible_to hides items in projects the user can't see" do
    open_page = Page.create!(team: @team, creator: @owner, title: "Open", content: "")
    game_page = Page.create!(team: @team, creator: @owner, title: "Game", content: "", project: @game)
    secret_page = Page.create!(team: @team, creator: @owner, title: "Secret", content: "", project: @secret)
    visible = [ open_page, game_page ].map { |page| notify(page) }
    notify(secret_page)

    assert_equal visible.map(&:id).sort, visible_ids
  end

  test "visible_to follows the item's current project, not the snapshot" do
    page = Page.create!(team: @team, creator: @owner, title: "Moving", content: "", project: @secret)
    notification = notify(page)
    assert_empty visible_ids

    page.update!(project: nil)
    assert_equal [ notification.id ], visible_ids
  end

  test "visible_to hides disabled features" do
    notification = notify(Diagram.create!(team: @team, creator: @owner, title: "Flow", content: "{}"))
    assert_equal [ notification.id ], visible_ids

    @team.update!(diagrams_enabled: false)
    assert_empty visible_ids
  end

  test "visible_to uses the snapshot project for deleted items" do
    open = Notification.create!(base_attributes.merge(kind: "item_deleted", item_type: "Page", project_id: nil))
    Notification.create!(base_attributes.merge(kind: "item_deleted", item_type: "Page", project_id: @secret.id))

    assert_equal [ open.id ], visible_ids
  end

  test "visible_to follows a ticket's board project change" do
    board = Board.create!(team: @team, creator: @owner, title: "Board")
    ticket = Ticket.create!(board: board, team: @team, created_by_user_id: @owner.id, title: "Bug", position: 0)
    notification = notify(ticket, board_id: board.id)
    assert_equal [ notification.id ], visible_ids

    board.update!(project: @secret)
    assert_empty visible_ids
  end

  private

  def base_attributes
    { user: @member, team: @team, actor: @owner, item_title: "Item", occurred_at: Time.current }
  end

  def notify(item, board_id: nil)
    Notification.create!(base_attributes.merge(kind: "item_changed", item: item, item_title: item.title, board_id: board_id, project_id: ProjectAccess.project_id_of(item)))
  end

  def visible_ids
    Notification.for(@member, @team).visible_to(ProjectAccess.new(@member, @team), @team).pluck(:id).sort
  end

  test "visible_to hides items while they or their board are in the trash" do
    folder = Folder.create!(team: @team, creator: @owner, title: "Docs", item_type: "Page")
    page_notification = notify(Page.create!(team: @team, creator: @owner, title: "In folder", content: "", folder: folder))
    board = Board.create!(team: @team, creator: @owner, title: "Board")
    ticket = Ticket.create!(board: board, team: @team, created_by_user_id: @owner.id, title: "Bug", position: 0)
    ticket_notification = notify(ticket, board_id: board.id)

    folder_entry = Trash.move(folder, @owner)
    board_entry = Trash.move(board, @owner)
    assert_empty visible_ids

    Trash.restore(folder_entry)
    Trash.restore(board_entry)
    assert_equal [ page_notification.id, ticket_notification.id ].sort, visible_ids
  end

  test "purging a trashed item deletes its notifications" do
    folder = Folder.create!(team: @team, creator: @owner, title: "Docs", item_type: "Page")
    notification = notify(Page.create!(team: @team, creator: @owner, title: "In folder", content: "", folder: folder))
    board = Board.create!(team: @team, creator: @owner, title: "Board")
    ticket_notification = notify(Ticket.create!(board: board, team: @team, created_by_user_id: @owner.id, title: "Bug", position: 0), board_id: board.id)

    Trash.purge(Trash.move(folder, @owner))
    Trash.purge(Trash.move(board, @owner))

    assert_not Notification.exists?(notification.id)
    assert_not Notification.exists?(ticket_notification.id)
  end
end
