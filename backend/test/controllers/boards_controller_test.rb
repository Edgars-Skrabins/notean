require "test_helper"

class BoardsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    token = JsonWebToken.encode(user_id: @user.id)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  test "index returns only boards matching the search term" do
    Board.create!(team: @team, creator: @user, title: "Sprint 12")
    Board.create!(team: @team, creator: @user, title: "Backlog grooming")

    get "/teams/#{@team.code}/boards?search=sprint", headers: @headers

    assert_response :success
    titles = JSON.parse(response.body)["boards"].map { |board| board["title"] }
    assert_equal [ "Sprint 12" ], titles
  end

  test "create defaults a blank title to Untitled" do
    post "/teams/#{@team.code}/boards", params: { board: { title: "" } }, headers: @headers, as: :json

    assert_response :created
    assert_equal "Untitled", JSON.parse(response.body)["board"]["title"]
  end

  test "create seeds the default To Do, Doing, Done columns in order" do
    post "/teams/#{@team.code}/boards", params: { board: { title: "Sprint 12" } }, headers: @headers, as: :json

    assert_response :created
    columns = JSON.parse(response.body)["board"]["columns"]
    assert_equal [ "To Do", "Doing", "Done" ], columns.map { |column| column["title"] }
    assert_equal [ 0, 1, 2 ], columns.map { |column| column["position"] }
  end

  test "show includes ticket summaries nested under each column" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    column = Column.create!(board: board, title: "To Do", position: 0)
    Ticket.create!(column: column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    get "/teams/#{@team.code}/boards/#{board.id}", headers: @headers

    assert_response :success
    tickets = JSON.parse(response.body)["board"]["columns"].first["tickets"]
    assert_equal [ "Fix bug" ], tickets.map { |ticket| ticket["title"] }
  end

  test "show returns the creator's nickname in this team" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")

    get "/teams/#{@team.code}/boards/#{board.id}", headers: @headers

    assert_response :success
    assert_equal({ "id" => @user.id, "nickname" => "alice", "avatar" => { "color" => @user.effective_avatar_color, "image_url" => nil } }, JSON.parse(response.body)["board"]["creator"])
  end

  test "update renames the board" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")

    patch "/teams/#{@team.code}/boards/#{board.id}", params: { board: { title: "Sprint 13" } }, headers: @headers, as: :json

    assert_response :success
    assert_equal "Sprint 13", board.reload.title
  end

  test "destroy removes the board and its columns" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    column = Column.create!(board: board, title: "To Do", position: 0)

    delete "/teams/#{@team.code}/boards/#{board.id}", headers: @headers

    assert_response :no_content
    assert_nil Board.find_by(id: board.id)
    assert_nil Column.find_by(id: column.id)
  end

  test "non-members cannot access a team's boards" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")
    token = JsonWebToken.encode(user_id: outsider.id)

    get "/teams/#{@team.code}/boards", headers: { "Authorization" => "Bearer #{token}" }

    assert_response :forbidden
  end

  def board_with_columns
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    [ board, Column.create!(board: board, title: "To Do", position: 0), Column.create!(board: board, title: "Done", position: 1) ]
  end

  def ticket_on(board, column, title, position, creator: @user)
    Ticket.create!(board: board, column: column, team: @team, created_by_user_id: creator.id, title: title, position: position)
  end

  test "show includes the backlog in order with column_id and updated_at on tickets" do
    board, todo, = board_with_columns
    ticket_on(board, todo, "On board", 0)
    ticket_on(board, nil, "Second", 1)
    ticket_on(board, nil, "First", 0)

    get "/teams/#{@team.code}/boards/#{board.id}", headers: @headers

    body = JSON.parse(response.body)["board"]
    assert_equal [ "First", "Second" ], body["backlog"].map { |ticket| ticket["title"] }
    assert_nil body["backlog"].first["column_id"]
    assert_equal todo.id, body["columns"].first["tickets"].first["column_id"]
    assert body["backlog"].first.key?("updated_at")
  end

  test "overview counts tickets per column including empty columns" do
    board, todo, done = board_with_columns
    ticket_on(board, todo, "A", 0)
    ticket_on(board, todo, "B", 1)
    ticket_on(board, nil, "Idea", 0)

    get "/teams/#{@team.code}/boards/#{board.id}/overview", headers: @headers

    assert_response :success
    overview = JSON.parse(response.body)["overview"]
    assert_equal [ 3, 2, 1 ], overview.values_at("total_tickets", "board_tickets", "backlog_tickets")
    assert_equal [ [ todo.id, 2 ], [ done.id, 0 ] ], overview["columns"].map { |column| [ column["id"], column["ticket_count"] ] }
  end

  test "overview counts recent activity and lists the five latest tickets" do
    board, todo, = board_with_columns
    travel_to 10.days.ago do
      ticket_on(board, todo, "Old", 0)
    end
    6.times { |index| travel_to(index.hours.ago) { ticket_on(board, index.even? ? todo : nil, "Recent #{index}", index) } }

    get "/teams/#{@team.code}/boards/#{board.id}/overview", headers: @headers

    overview = JSON.parse(response.body)["overview"]
    assert_equal 6, overview["created_last_7_days"]
    assert_equal 6, overview["updated_last_7_days"]
    assert_equal (0..4).map { |index| "Recent #{index}" }, overview["recent_tickets"].map { |ticket| ticket["title"] }
    assert_equal "To Do", overview["recent_tickets"].first["column_title"]
    assert_nil overview["recent_tickets"].second["column_title"]
  end

  test "index runs the same number of queries for 1 and 10 boards" do
    attach_avatar(@user)
    members = 3.times.map { |index| create_member(@team, nickname_for(index), with_avatar: index.zero?) }
    Board.create!(team: @team, creator: @user, title: "First")
    one = query_count { get "/teams/#{@team.code}/boards", headers: @headers }

    9.times { |index| Board.create!(team: @team, creator: members[index % 3], title: "Board #{index}") }
    ten = query_count { get "/teams/#{@team.code}/boards", headers: @headers }

    assert_equal one, ten
  end

  test "show and overview run the same number of queries for 1 and 10 tickets" do
    attach_avatar(@user)
    board, todo, done = board_with_columns
    ticket_on(board, todo, "First", 0)
    show_one = query_count { get "/teams/#{@team.code}/boards/#{board.id}", headers: @headers }
    overview_one = query_count { get "/teams/#{@team.code}/boards/#{board.id}/overview", headers: @headers }

    9.times { |index| ticket_on(board, [ todo, done, nil ][index % 3], "Ticket #{index}", index + 1) }
    show_ten = query_count { get "/teams/#{@team.code}/boards/#{board.id}", headers: @headers }
    overview_ten = query_count { get "/teams/#{@team.code}/boards/#{board.id}/overview", headers: @headers }

    assert_equal show_one, show_ten
    assert_equal overview_one, overview_ten
  end

  test "show includes the assignees of each ticket" do
    board, todo, = board_with_columns
    bob = create_member(@team, "Bob")
    ticket = ticket_on(board, todo, "Bug", 0)
    TicketAssignee.create!(ticket: ticket, user: bob)

    get "/teams/#{@team.code}/boards/#{board.id}", headers: @headers

    assignees = JSON.parse(response.body)["board"]["columns"].first["tickets"].first["assignees"]
    assert_equal [ "Bob" ], assignees.map { |assignee| assignee["nickname"] }
  end

  test "overview counts tickets per assignee, once per assignee, plus unassigned" do
    board, todo, = board_with_columns
    bob = create_member(@team, "Bob")
    shared = ticket_on(board, todo, "Shared", 0)
    only_bob = ticket_on(board, nil, "Bob only", 0)
    ticket_on(board, todo, "Nobody", 1)
    TicketAssignee.create!(ticket: shared, user: @user)
    TicketAssignee.create!(ticket: shared, user: bob)
    TicketAssignee.create!(ticket: only_bob, user: bob)

    get "/teams/#{@team.code}/boards/#{board.id}/overview", headers: @headers

    rows = JSON.parse(response.body)["overview"]["assignees"]
    assert_equal [ [ "Bob", 2 ], [ "alice", 1 ], [ nil, 1 ] ], rows.map { |row| [ row["user"]&.dig("nickname"), row["ticket_count"] ] }
  end

  test "show runs the same number of queries for 1 and 10 assigned tickets" do
    attach_avatar(@user)
    board, todo, = board_with_columns
    TicketAssignee.create!(ticket: ticket_on(board, todo, "First", 0), user: @user)
    one = query_count { get "/teams/#{@team.code}/boards/#{board.id}", headers: @headers }

    members = 3.times.map { |index| create_member(@team, nickname_for(index), with_avatar: index.zero?) }
    9.times { |index| TicketAssignee.create!(ticket: ticket_on(board, index.even? ? todo : nil, "T#{index}", index + 1), user: members[index % 3]) }
    ten = query_count { get "/teams/#{@team.code}/boards/#{board.id}", headers: @headers }

    assert_equal one, ten
  end

  test "returns FEATURE_DISABLED when boards are turned off" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @team.update!(boards_enabled: false)

    get "/teams/#{@team.code}/boards", headers: @headers
    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, JSON.parse(response.body))

    get "/teams/#{@team.code}/boards/#{board.id}/overview", headers: @headers
    assert_response :forbidden

    post "/teams/#{@team.code}/boards", params: { board: { title: "New" } }, headers: @headers, as: :json
    assert_response :forbidden
    assert_equal 1, @team.boards.count
  end
end
