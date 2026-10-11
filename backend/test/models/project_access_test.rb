require "test_helper"

class ProjectAccessTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @owner, role: "owner", nickname: "Alice")
    @admin = create_member(@team, "Adam")
    @admin.memberships.first.update!(role: "admin")
    @member = create_member(@team, "Bob")
    @outsider = create_member(@team, "Carol")
    @game = Project.create!(team: @team, name: "Game", owner: @owner, creator: @owner)
    @game.project_members.create!(user: @member)
    @secret = Project.create!(team: @team, name: "Secret", owner: @owner, creator: @owner)
  end

  test "owners and admins see every project" do
    assert_equal [ @game.id, @secret.id ].sort, ProjectAccess.new(@owner, @team).visible_project_ids.sort
    assert_equal [ @game.id, @secret.id ].sort, ProjectAccess.new(@admin, @team).visible_project_ids.sort
  end

  test "members see only their projects and non-members see none" do
    assert_equal [ @game.id ], ProjectAccess.new(@member, @team).visible_project_ids
    assert_equal [], ProjectAccess.new(@outsider, @team).visible_project_ids
  end

  test "scope keeps projectless items and visible projects" do
    open_page = Page.create!(team: @team, creator: @owner, title: "Open", content: "")
    game_page = Page.create!(team: @team, creator: @owner, title: "Game", content: "", project: @game)
    Page.create!(team: @team, creator: @owner, title: "Secret", content: "", project: @secret)

    assert_equal [ open_page, game_page ].sort_by(&:id), ProjectAccess.new(@member, @team).scope(@team.pages).order(:id).to_a
    assert_equal [ game_page ], ProjectAccess.new(@member, @team).filter(@team.pages, @game.id).to_a
  end

  test "tickets follow their board's project" do
    board = Board.create!(team: @team, creator: @owner, title: "Hidden", project: @secret)
    ticket = Ticket.create!(board: board, team: @team, created_by_user_id: @owner.id, title: "Bug", position: 0)

    assert_not ProjectAccess.new(@member, @team).visible?(ticket)
    assert ProjectAccess.new(@admin, @team).visible?(ticket)
  end

  test "only the project owner and the team owner can manage a project" do
    owned_by_admin = Project.create!(team: @team, name: "Admin's", owner: @admin, creator: @owner)

    assert ProjectAccess.new(@owner, @team).can_manage?(owned_by_admin)
    assert ProjectAccess.new(@admin, @team).can_manage?(owned_by_admin)
    assert_not ProjectAccess.new(@admin, @team).can_manage?(@game)
    assert_not ProjectAccess.new(@member, @team).can_manage?(@game)
  end

  test "users_who_can_see a project board are its members plus owners and admins" do
    board = Board.create!(team: @team, creator: @owner, title: "Game board", project: @game)
    open_board = Board.create!(team: @team, creator: @owner, title: "Open")

    assert_equal [ @owner, @admin, @member ].map(&:id).sort, ProjectAccess.users_who_can_see(board).pluck(:id).sort
    assert_equal 4, ProjectAccess.users_who_can_see(open_board).count
  end

  test "cleanup removes assignees who lost access and keeps favorites" do
    board = Board.create!(team: @team, creator: @owner, title: "Game board", project: @game)
    ticket = Ticket.create!(board: board, team: @team, created_by_user_id: @owner.id, title: "Bug", position: 0)
    TicketAssignee.create!(ticket: ticket, user: @member)
    TicketAssignee.create!(ticket: ticket, user: @owner)
    favorite = Favorite.create!(user: @member, team: @team, favoritable: ticket, home_position: 0, sidebar_position: 0)

    board.update!(project: @secret)
    ProjectAccessCleanup.for_board(board)

    assert_equal [ @owner ], ticket.reload.assignees.to_a
    assert Favorite.exists?(favorite.id)
  end
end
