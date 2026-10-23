require "test_helper"

class MyWorkControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    @bob = create_member(@team, "Bob")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @column = Column.create!(board: @board, title: "Doing", position: 0)
    @headers = { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: @user.id)}" }
  end

  def ticket(title, column: @column, board: @board, team: @team, assignees: [ @user ])
    created = Ticket.create!(board: board, column: column, team: team, created_by_user_id: @user.id, title: title, position: 0)
    assignees.each { |user| TicketAssignee.create!(ticket: created, user: user) }
    created
  end

  def my_work
    get "/teams/#{@team.code}/my_work", headers: @headers
    JSON.parse(response.body)["tickets"]
  end

  test "returns only tickets assigned to the caller" do
    ticket("Mine")
    ticket("Bob's", assignees: [ @bob ])
    ticket("Nobody's", assignees: [])

    assert_equal [ "Mine" ], my_work.map { |item| item["title"] }
  end

  test "includes backlog tickets with empty column fields" do
    ticket("Idea", column: nil)

    item = my_work.first
    assert_nil item["column_id"]
    assert_nil item["column_title"]
    assert_equal [ @board.id, "Sprint 12" ], item.values_at("board_id", "board_title")
  end

  test "leaves out tickets from other teams" do
    other_team = Team.create!(name: "Other", password: "supersecret")
    Membership.create!(user: @user, team: other_team, nickname: "Alice")
    other_board = Board.create!(team: other_team, creator: @user, title: "Elsewhere")
    ticket("Elsewhere", column: nil, board: other_board, team: other_team)
    ticket("Here")

    assert_equal [ "Here" ], my_work.map { |item| item["title"] }
  end

  test "orders tickets by last update, newest first, with every assignee" do
    travel_to(2.days.ago) { ticket("Older", assignees: [ @user, @bob ]) }
    ticket("Newer")

    items = my_work
    assert_equal [ "Newer", "Older" ], items.map { |item| item["title"] }
    assert_equal [ "Alice", "Bob" ], items.second["assignees"].map { |assignee| assignee["nickname"] }
    assert_equal "Doing", items.first["column_title"]
  end

  test "returns NOT_TEAM_MEMBER for someone outside the team" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    get "/teams/#{@team.code}/my_work", headers: { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: outsider.id)}" }

    assert_response :forbidden
    assert_equal "NOT_TEAM_MEMBER", JSON.parse(response.body)["code"]
  end

  test "runs the same number of queries for 1 and 10 tickets" do
    attach_avatar(@user)
    ticket("First", assignees: [ @user, @bob ])
    one = query_count { get "/teams/#{@team.code}/my_work", headers: @headers }

    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    9.times { |index| ticket("Ticket #{index}", column: index.even? ? @column : nil, board: index.even? ? @board : other_board, assignees: [ @user, @bob ]) }
    ten = query_count { get "/teams/#{@team.code}/my_work", headers: @headers }

    assert_equal 10, JSON.parse(response.body)["tickets"].length
    assert_equal one, ten
  end

  test "returns an empty list when boards are turned off" do
    ticket("Mine")
    @team.update!(boards_enabled: false)

    assert_equal [], my_work
    assert_response :success
  end
end
