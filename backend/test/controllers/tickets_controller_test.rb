require "test_helper"

class TicketsControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    token = session_token(@user)
    @headers = { "Authorization" => "Bearer #{token}" }
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @board.columns.destroy_all
    @todo = Column.create!(board: @board, title: "To Do", position: 0)
    @doing = Column.create!(board: @board, title: "Doing", position: 1)
  end

  test "create assigns the next position in the target column" do
    Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Existing", position: 0)

    post "/teams/#{@team.code}/boards/#{@board.id}/tickets",
      params: { ticket: { title: "Fix bug", column_id: @todo.id } },
      headers: @headers,
      as: :json

    assert_response :created
    assert_equal 1, JSON.parse(response.body)["ticket"]["position"]
  end

  test "create assigns position 0 to the first ticket in an empty column" do
    post "/teams/#{@team.code}/boards/#{@board.id}/tickets",
      params: { ticket: { title: "Fix bug", column_id: @todo.id } },
      headers: @headers,
      as: :json

    assert_response :created
    assert_equal 0, JSON.parse(response.body)["ticket"]["position"]
  end

  test "create defaults a blank title to Untitled" do
    post "/teams/#{@team.code}/boards/#{@board.id}/tickets",
      params: { ticket: { title: "", column_id: @todo.id } },
      headers: @headers,
      as: :json

    assert_response :created
    assert_equal "Untitled", JSON.parse(response.body)["ticket"]["title"]
  end

  test "create sets team_id from the url, ignoring any team_id in the body" do
    other_team = Team.create!(name: "Other", password: "supersecret")

    post "/teams/#{@team.code}/boards/#{@board.id}/tickets",
      params: { ticket: { title: "Fix bug", column_id: @todo.id, team_id: other_team.id } },
      headers: @headers,
      as: :json

    assert_response :created
    assert_equal @team.id, Ticket.last.team_id
  end

  test "create rejects a column that does not belong to this board" do
    other_board = Board.create!(team: @team, creator: @user, title: "Backlog")
    foreign_column = Column.create!(board: other_board, title: "To Do", position: 0)

    post "/teams/#{@team.code}/boards/#{@board.id}/tickets",
      params: { ticket: { title: "Fix bug", column_id: foreign_column.id } },
      headers: @headers,
      as: :json

    assert_response :not_found
  end

  test "show returns the ticket" do
    ticket = Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    get "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{ticket.id}", headers: @headers

    assert_response :success
    assert_equal "Fix bug", JSON.parse(response.body)["ticket"]["title"]
    assert_equal "alice", JSON.parse(response.body)["ticket"]["creator"]["nickname"]
  end

  test "update renames a ticket and edits its description without touching position" do
    ticket = Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    patch "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{ticket.id}",
      params: { ticket: { title: "Fix the bug", description: "Steps to reproduce...", lock_version: 0 } },
      headers: @headers,
      as: :json

    assert_response :success
    ticket.reload
    assert_equal "Fix the bug", ticket.title
    assert_equal "Steps to reproduce...", ticket.description
    assert_equal 0, ticket.position
    assert_equal @todo.id, ticket.column_id
  end

  test "move within the same column reindexes siblings contiguously" do
    first = Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "First", position: 0)
    second = Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Second", position: 1)
    third = Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Third", position: 2)

    patch "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{third.id}",
      params: { ticket: { column_id: @todo.id, position: 0 } },
      headers: @headers,
      as: :json

    assert_response :success
    ordered = @todo.tickets.reload.order(:position)
    assert_equal [ third.id, first.id, second.id ], ordered.pluck(:id)
    assert_equal [ 0, 1, 2 ], ordered.pluck(:position)
  end

  test "move across columns reindexes the destination and closes the gap in the source" do
    first = Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "First", position: 0)
    second = Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Second", position: 1)
    existing = Ticket.create!(column: @doing, team: @team, created_by_user_id: @user.id, title: "Existing", position: 0)

    patch "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{first.id}",
      params: { ticket: { column_id: @doing.id, position: 0 } },
      headers: @headers,
      as: :json

    assert_response :success
    assert_equal @doing.id, first.reload.column_id

    destination = @doing.tickets.reload.order(:position)
    assert_equal [ first.id, existing.id ], destination.pluck(:id)
    assert_equal [ 0, 1 ], destination.pluck(:position)

    source = @todo.tickets.reload
    assert_equal [ second.id ], source.pluck(:id)
    assert_equal [ 0 ], source.pluck(:position)
  end

  test "move rejects a target column that does not belong to this board" do
    other_board = Board.create!(team: @team, creator: @user, title: "Backlog")
    foreign_column = Column.create!(board: other_board, title: "To Do", position: 0)
    ticket = Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    patch "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{ticket.id}",
      params: { ticket: { column_id: foreign_column.id } },
      headers: @headers,
      as: :json

    assert_response :not_found
  end

  test "destroy moves the ticket to the trash" do
    ticket = Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    delete "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{ticket.id}", headers: @headers

    assert_response :success
    entry = TrashEntry.find_by!(item_type: "Ticket", item_id: ticket.id)
    assert_equal({ "trash_entry_ids" => [ entry.id ] }, JSON.parse(response.body))
    assert_nil Ticket.find_by(id: ticket.id)
  end

  test "non-members cannot access a board's tickets" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")
    token = session_token(outsider)

    get "/teams/#{@team.code}/boards/#{@board.id}/tickets/1", headers: { "Authorization" => "Bearer #{token}" }

    assert_response :forbidden
  end

  def ticket_in(column, title, position)
    Ticket.create!(board: @board, column: column, team: @team, created_by_user_id: @user.id, title: title, position: position)
  end

  def tickets_url(id = nil)
    [ "/teams/#{@team.code}/boards/#{@board.id}/tickets", id ].compact.join("/")
  end

  test "create without a column puts the ticket at the bottom of the backlog" do
    ticket_in(nil, "Existing", 0)

    post tickets_url, params: { ticket: { title: "Idea" } }, headers: @headers, as: :json

    assert_response :created
    ticket = JSON.parse(response.body)["ticket"]
    assert_nil ticket["column_id"]
    assert_equal @board.id, ticket["board_id"]
    assert_equal 1, ticket["position"]
  end

  test "moving from the backlog to a column puts the ticket at the bottom of that column" do
    ticket_in(@todo, "First", 0)
    idea = ticket_in(nil, "Idea", 0)

    patch tickets_url(idea.id), params: { ticket: { column_id: @todo.id } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ @todo.id, 1 ], [ idea.reload.column_id, idea.position ]
  end

  test "to_backlog moves a column ticket to the bottom of the backlog" do
    ticket_in(nil, "Idea", 0)
    bug = ticket_in(@todo, "Bug", 0)

    patch tickets_url(bug.id), params: { ticket: { to_backlog: true } }, headers: @headers, as: :json

    assert_response :success
    assert_nil bug.reload.column_id
    assert_equal 1, bug.position
  end

  test "reordering within the backlog reindexes it" do
    first = ticket_in(nil, "First", 0)
    second = ticket_in(nil, "Second", 1)
    third = ticket_in(nil, "Third", 2)

    patch tickets_url(third.id), params: { ticket: { position: 0 } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ third, first, second ], @board.backlog_tickets.reload.to_a
    assert_equal [ 0, 1, 2 ], @board.backlog_tickets.map(&:position)
  end

  test "moving to an unknown column returns COLUMN_NOT_FOUND" do
    idea = ticket_in(nil, "Idea", 0)

    patch tickets_url(idea.id), params: { ticket: { column_id: 0 } }, headers: @headers, as: :json

    assert_response :not_found
    assert_equal "COLUMN_NOT_FOUND", JSON.parse(response.body)["code"]
    assert_nil idea.reload.column_id
  end

  test "returns FEATURE_DISABLED when boards are turned off" do
    ticket = Ticket.create!(column: @todo, board: @board, team: @team, created_by_user_id: @user.id, title: "Existing", position: 0)
    @team.update!(boards_enabled: false)

    get "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{ticket.id}", headers: @headers
    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, JSON.parse(response.body))

    delete "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{ticket.id}", headers: @headers
    assert_response :forbidden
    assert Ticket.exists?(ticket.id)
  end

  def bulk_url
    "#{tickets_url}/bulk"
  end

  def bulk_update(params)
    patch bulk_url, params: { bulk: params }, headers: @headers, as: :json
  end

  test "ticket summaries in the board include created_at" do
    ticket_in(nil, "Idea", 0)

    get "/teams/#{@team.code}/boards/#{@board.id}", headers: @headers

    assert_response :success
    assert JSON.parse(response.body)["board"]["backlog"].first["created_at"].present?
  end

  test "bulk status appends the tickets to the column in the given order and reindexes the sources" do
    existing = ticket_in(@doing, "Existing", 0)
    first = ticket_in(nil, "First", 0)
    kept = ticket_in(nil, "Kept", 1)
    second = ticket_in(@todo, "Second", 0)
    todo_kept = ticket_in(@todo, "Todo kept", 1)

    bulk_update(ticket_ids: [ second.id, first.id ], column_id: @doing.id)

    assert_response :success
    assert_equal [ second.id, first.id ], JSON.parse(response.body)["tickets"].map { |ticket| ticket["id"] }
    assert_equal [ existing, second, first ], @doing.tickets.reload.to_a
    assert_equal [ 0, 1, 2 ], @doing.tickets.map(&:position)
    assert_equal 0, kept.reload.position
    assert_equal 0, todo_kept.reload.position
  end

  test "bulk to_backlog moves column tickets to the end of the backlog" do
    ticket_in(nil, "Idea", 0)
    bug = ticket_in(@todo, "Bug", 0)

    bulk_update(ticket_ids: [ bug.id ], to_backlog: true)

    assert_response :success
    assert_nil bug.reload.column_id
    assert_equal 1, bug.position
  end

  test "bulk status to an unknown column returns COLUMN_NOT_FOUND" do
    idea = ticket_in(nil, "Idea", 0)

    bulk_update(ticket_ids: [ idea.id ], column_id: 0)

    assert_response :not_found
    assert_equal "COLUMN_NOT_FOUND", JSON.parse(response.body)["code"]
    assert_nil idea.reload.column_id
  end

  test "bulk assign adds the member to every ticket without duplicates" do
    bob = create_member(@team, "Bob")
    first = ticket_in(nil, "First", 0)
    second = ticket_in(nil, "Second", 1)
    TicketAssignee.create!(ticket: first, user: bob)

    bulk_update(ticket_ids: [ first.id, second.id ], add_assignee_id: bob.id)

    assert_response :success
    assert_equal [ [ bob.id ], [ bob.id ] ], JSON.parse(response.body)["tickets"].map { |ticket| ticket["assignees"].map { |assignee| assignee["id"] } }
    assert_equal 2, TicketAssignee.where(user: bob).count
  end

  test "bulk assign rejects someone outside the team and changes nothing" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")
    idea = ticket_in(nil, "Idea", 0)

    bulk_update(ticket_ids: [ idea.id ], add_assignee_id: outsider.id)

    assert_response :unprocessable_entity
    assert_equal "ASSIGNEE_NOT_TEAM_MEMBER", JSON.parse(response.body)["code"]
    assert_empty idea.ticket_assignees.reload
  end

  test "bulk assign rejects a member who cannot see the board's project" do
    bob = create_member(@team, "Bob")
    project = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    @board.update!(project: project)
    idea = ticket_in(nil, "Idea", 0)

    bulk_update(ticket_ids: [ idea.id ], add_assignee_id: bob.id)

    assert_response :unprocessable_entity
    assert_equal "ASSIGNEE_NO_ACCESS", JSON.parse(response.body)["code"]
  end

  test "bulk unassign removes the member from every ticket" do
    bob = create_member(@team, "Bob")
    first = ticket_in(nil, "First", 0)
    second = ticket_in(nil, "Second", 1)
    TicketAssignee.create!(ticket: first, user: bob)
    TicketAssignee.create!(ticket: first, user: @user)

    bulk_update(ticket_ids: [ first.id, second.id ], remove_assignee_id: bob.id)

    assert_response :success
    assert_equal [ @user.id ], first.reload.assignees.map(&:id)
    assert_empty second.reload.assignees
  end

  test "bulk assign and unassign keep the lock version and refresh updated_at" do
    bob = create_member(@team, "Bob")
    idea = ticket_in(nil, "Idea", 0)

    travel_to 1.hour.from_now do
      bulk_update(ticket_ids: [ idea.id ], add_assignee_id: bob.id)

      assert_response :success
      assert_equal [ 0, [ bob.id ] ], [ idea.reload.lock_version, idea.assignees.map(&:id) ]
      assert_in_delta Time.current, idea.updated_at, 1.second

      travel 1.hour
      bulk_update(ticket_ids: [ idea.id ], remove_assignee_id: bob.id)

      assert_response :success
      assert_equal [ 0, [] ], [ idea.reload.lock_version, idea.assignees.map(&:id) ]
      assert_in_delta Time.current, idea.updated_at, 1.second
    end
  end

  test "a ticket from another board fails the whole bulk request" do
    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    foreign = Ticket.create!(board: other_board, team: @team, created_by_user_id: @user.id, title: "Foreign", position: 0)
    idea = ticket_in(nil, "Idea", 0)

    bulk_update(ticket_ids: [ idea.id, foreign.id ], column_id: @todo.id)

    assert_response :not_found
    assert_equal "TICKET_NOT_FOUND", JSON.parse(response.body)["code"]
    assert_nil idea.reload.column_id
    assert_nil foreign.reload.column_id
  end

  test "bulk update requires exactly one action and some tickets" do
    idea = ticket_in(nil, "Idea", 0)

    [
      { ticket_ids: [ idea.id ] },
      { ticket_ids: [ idea.id ], column_id: @todo.id, to_backlog: true },
      { ticket_ids: [], column_id: @todo.id }
    ].each do |params|
      bulk_update(params)

      assert_response :unprocessable_entity
      assert_equal "BULK_ACTION_INVALID", JSON.parse(response.body)["code"]
    end
    assert_nil idea.reload.column_id
  end

  test "bulk delete removes every ticket and reindexes what remains" do
    first = ticket_in(nil, "First", 0)
    kept = ticket_in(nil, "Kept", 1)
    second = ticket_in(@todo, "Second", 0)

    delete bulk_url, params: { bulk: { ticket_ids: [ first.id, second.id ] } }, headers: @headers, as: :json

    assert_response :success
    assert_equal 2, JSON.parse(response.body)["trash_entry_ids"].length
    assert_equal 2, TrashEntry.count
    assert_nil Ticket.find_by(id: first.id)
    assert_nil Ticket.find_by(id: second.id)
    assert_equal 0, kept.reload.position
  end

  test "bulk delete with a foreign ticket deletes nothing" do
    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    foreign = Ticket.create!(board: other_board, team: @team, created_by_user_id: @user.id, title: "Foreign", position: 0)
    idea = ticket_in(nil, "Idea", 0)

    delete bulk_url, params: { bulk: { ticket_ids: [ idea.id, foreign.id ] } }, headers: @headers, as: :json

    assert_response :not_found
    assert Ticket.exists?(idea.id)
    assert Ticket.exists?(foreign.id)
  end

  test "bulk assign query count does not grow with the number of tickets" do
    bob = create_member(@team, "Bob", with_avatar: true)
    tickets = 10.times.map { |index| ticket_in(nil, "Ticket #{index}", index) }

    one = query_count { bulk_update(ticket_ids: [ tickets.first.id ], add_assignee_id: bob.id) }
    ten = query_count { bulk_update(ticket_ids: tickets.map(&:id), add_assignee_id: bob.id) }

    assert_equal one, ten
  end

  test "bulk update reads descriptions only for the tickets it changes" do
    bob = create_member(@team, "Bob")
    tickets = 3.times.map { |index| ticket_in(nil, "Ticket #{index}", index) }

    queries = ticket_description_selects { bulk_update(ticket_ids: tickets.map(&:id), add_assignee_id: bob.id) }

    assert_response :success
    assert_equal 1, queries.length
  end

  test "update sets and clears a ticket's priority" do
    idea = ticket_in(nil, "Idea", 0)
    high = @board.priorities.find_by!(name: "High")

    patch tickets_url(idea.id), params: { ticket: { priority_id: high.id } }, headers: @headers, as: :json

    assert_response :success
    assert_equal high.id, JSON.parse(response.body)["ticket"]["priority_id"]
    assert_equal high, idea.reload.priority

    patch tickets_url(idea.id), params: { ticket: { priority_id: nil } }, headers: @headers, as: :json

    assert_response :success
    assert_nil JSON.parse(response.body)["ticket"]["priority_id"]
    assert_nil idea.reload.priority_id
  end

  test "update rejects a priority from another board" do
    idea = ticket_in(nil, "Idea", 0)
    other_board = Board.create!(team: @team, creator: @user, title: "Other")

    patch tickets_url(idea.id), params: { ticket: { priority_id: other_board.priorities.first.id } }, headers: @headers, as: :json

    assert_response :not_found
    assert_equal "PRIORITY_NOT_FOUND", JSON.parse(response.body)["code"]
    assert_nil idea.reload.priority_id
  end

  test "ticket summaries include priority_id" do
    ticket_in(nil, "Idea", 0).update!(priority: @board.priorities.first)

    get "/teams/#{@team.code}/boards/#{@board.id}", headers: @headers

    assert_equal @board.priorities.first.id, JSON.parse(response.body)["board"]["backlog"][0]["priority_id"]
  end

  test "create broadcasts the new ticket with its description" do
    post tickets_url, params: { ticket: { title: "Fix bug", column_id: @todo.id } }, headers: @headers, as: :json

    assert_response :created
    assert_broadcast_on(BoardChannel.stream_name(@board), type: "tickets_upserted", tickets: [ ticket_broadcast_json(JSON.parse(response.body)["ticket"]) ])
  end

  test "update broadcasts the ticket with its description" do
    ticket = ticket_in(@todo, "Fix bug", 0)

    patch tickets_url(ticket.id), params: { ticket: { title: "Fix the bug", description: "<p>Steps</p>", lock_version: 0 } }, headers: @headers, as: :json

    assert_response :success
    assert_broadcast_on(BoardChannel.stream_name(@board), type: "tickets_upserted", tickets: [ ticket_broadcast_json(JSON.parse(response.body)["ticket"]) ])
  end

  test "a move broadcasts the shifted range and then only the moved ticket" do
    ticket_in(@todo, "First", 0)
    ticket_in(@todo, "Second", 1)
    third = ticket_in(@todo, "Third", 2)
    ticket_in(@todo, "Fourth", 3)

    patch tickets_url(third.id), params: { ticket: { column_id: @todo.id, position: 1 } }, headers: @headers, as: :json

    assert_response :success
    shifted, upserted = board_broadcasts(@board)
    assert_equal({ "type" => "tickets_shifted", "shifts" => [ { "column_id" => @todo.id, "from_position" => 1, "to_position" => 1, "delta" => 1 } ] }, shifted)
    assert_equal "tickets_upserted", upserted["type"]
    assert_equal [ [ third.id, 1 ] ], upserted["tickets"].map { |ticket| [ ticket["id"], ticket["position"] ] }
  end

  test "a cross-column move broadcasts the closed source and the opened target" do
    first = ticket_in(@todo, "First", 0)
    ticket_in(@todo, "Second", 1)
    ticket_in(@doing, "Existing", 0)

    patch tickets_url(first.id), params: { ticket: { column_id: @doing.id, position: 0 } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [
      { "column_id" => @todo.id, "from_position" => 1, "to_position" => nil, "delta" => -1 },
      { "column_id" => @doing.id, "from_position" => 0, "to_position" => nil, "delta" => 1 }
    ], board_broadcasts(@board).first["shifts"]
  end

  test "an edit without a move broadcasts no shift" do
    ticket = ticket_in(@todo, "Fix bug", 0)

    patch tickets_url(ticket.id), params: { ticket: { priority_id: nil } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ "tickets_upserted" ], board_broadcasts(@board).map { |message| message["type"] }
  end

  test "a failed update broadcasts nothing" do
    ticket = ticket_in(@todo, "Fix bug", 0)

    assert_no_broadcasts(BoardChannel.stream_name(@board)) do
      patch tickets_url(ticket.id), params: { ticket: { column_id: 0 } }, headers: @headers, as: :json
    end
    assert_response :not_found
  end

  test "destroy broadcasts the closed gap and then the removed ticket id" do
    ticket = ticket_in(@todo, "Fix bug", 0)

    delete tickets_url(ticket.id), headers: @headers

    assert_response :success
    assert_equal [
      { "type" => "tickets_shifted", "shifts" => [ { "column_id" => @todo.id, "from_position" => 1, "to_position" => nil, "delta" => -1 } ] },
      { "type" => "tickets_removed", "ticket_ids" => [ ticket.id ] }
    ], board_broadcasts(@board)
  end

  test "bulk update broadcasts the source shifts and then only the moved tickets" do
    first = ticket_in(nil, "First", 0)
    ticket_in(nil, "Kept", 1)
    second = ticket_in(@todo, "Second", 0)

    bulk_update(ticket_ids: [ second.id, first.id ], column_id: @doing.id)

    assert_response :success
    shifted, upserted = board_broadcasts(@board)
    assert_equal "tickets_shifted", shifted["type"]
    assert_equal [
      { "column_id" => @todo.id, "from_position" => 1, "to_position" => nil, "delta" => -1 },
      { "column_id" => nil, "from_position" => 1, "to_position" => nil, "delta" => -1 }
    ], shifted["shifts"]
    assert_equal "tickets_upserted", upserted["type"]
    assert_equal JSON.parse(response.body)["tickets"], upserted["tickets"]
  end

  test "bulk assign broadcasts no shift" do
    bob = create_member(@team, "Bob")
    idea = ticket_in(nil, "Idea", 0)

    bulk_update(ticket_ids: [ idea.id ], add_assignee_id: bob.id)

    assert_response :success
    assert_equal [ "tickets_upserted" ], board_broadcasts(@board).map { |message| message["type"] }
  end

  test "bulk delete broadcasts the closed gaps and then the removed ticket ids" do
    first = ticket_in(nil, "First", 0)
    second = ticket_in(@todo, "Second", 0)

    delete bulk_url, params: { bulk: { ticket_ids: [ first.id, second.id ] } }, headers: @headers, as: :json

    assert_response :success
    shifted, removed = board_broadcasts(@board)
    assert_equal "tickets_shifted", shifted["type"]
    assert_equal [ nil, @todo.id ], shifted["shifts"].map { |shift| shift["column_id"] }
    assert_equal({ "type" => "tickets_removed", "ticket_ids" => [ first.id, second.id ] }, removed)
  end

  test "a cross-column move keeps both columns dense" do
    moved = ticket_in(@todo, "Moved", 1)
    todo = [ ticket_in(@todo, "A", 0), ticket_in(@todo, "B", 2), ticket_in(@todo, "C", 3) ]
    doing = [ ticket_in(@doing, "D", 0), ticket_in(@doing, "E", 1) ]

    patch tickets_url(moved.id), params: { ticket: { column_id: @doing.id, position: 1 } }, headers: @headers, as: :json

    assert_response :success
    assert_equal todo, @todo.tickets.reload.order(:position).to_a
    assert_equal [ 0, 1, 2 ], @todo.tickets.order(:position).pluck(:position)
    assert_equal [ doing[0], moved, doing[1] ], @doing.tickets.reload.order(:position).to_a
    assert_equal [ 0, 1, 2 ], @doing.tickets.order(:position).pluck(:position)
  end

  test "a move down within a column keeps it dense" do
    tickets = 4.times.map { |index| ticket_in(@todo, "Ticket #{index}", index) }

    patch tickets_url(tickets[0].id), params: { ticket: { position: 2 } }, headers: @headers, as: :json

    assert_response :success
    assert_equal tickets.values_at(1, 2, 0, 3), @todo.tickets.reload.order(:position).to_a
    assert_equal [ 0, 1, 2, 3 ], @todo.tickets.order(:position).pluck(:position)
  end

  test "a move past the end is clamped to the last position" do
    tickets = 3.times.map { |index| ticket_in(@todo, "Ticket #{index}", index) }
    ticket_in(@doing, "Other", 0)

    patch tickets_url(tickets[0].id), params: { ticket: { position: 99 } }, headers: @headers, as: :json
    patch tickets_url(tickets[1].id), params: { ticket: { column_id: @doing.id, position: 99 } }, headers: @headers, as: :json

    assert_equal [ tickets[2], tickets[0] ], @todo.tickets.reload.order(:position).to_a
    assert_equal [ 0, 1 ], @todo.tickets.order(:position).pluck(:position)
    assert_equal [ @doing.id, 1 ], [ tickets[1].reload.column_id, tickets[1].position ]
  end

  test "a failed save rolls back the shifts" do
    tickets = 3.times.map { |index| ticket_in(@todo, "Ticket #{index}", index) }

    patch tickets_url(tickets[2].id), params: { ticket: { position: 0, title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1), lock_version: 0 } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal [ 0, 1, 2 ], tickets.map { |ticket| ticket.reload.position }
  end

  test "a single delete closes its gap" do
    tickets = 4.times.map { |index| ticket_in(nil, "Ticket #{index}", index) }

    delete tickets_url(tickets[1].id), headers: @headers

    assert_response :success
    assert_equal [ 0, 1, 2 ], tickets.values_at(0, 2, 3).map { |ticket| ticket.reload.position }
  end

  test "a bulk move from two groups keeps every group dense" do
    backlog = 3.times.map { |index| ticket_in(nil, "Backlog #{index}", index) }
    todo = 3.times.map { |index| ticket_in(@todo, "Todo #{index}", index) }
    doing = ticket_in(@doing, "Doing", 0)

    bulk_update(ticket_ids: [ todo[1].id, backlog[0].id, backlog[2].id ], column_id: @doing.id)

    assert_response :success
    assert_equal [ [ backlog[1].id, 0 ] ], @board.backlog_tickets.reload.map { |ticket| [ ticket.id, ticket.position ] }
    assert_equal [ [ todo[0].id, 0 ], [ todo[2].id, 1 ] ], @todo.tickets.reload.order(:position).map { |ticket| [ ticket.id, ticket.position ] }
    assert_equal [ doing, todo[1], backlog[0], backlog[2] ], @doing.tickets.reload.order(:position).to_a
    assert_equal [ 0, 1, 2, 3 ], @doing.tickets.order(:position).pluck(:position)
  end

  test "a bulk move into a column it also takes tickets from keeps the moved tickets at the end" do
    todo = 3.times.map { |index| ticket_in(@todo, "Todo #{index}", index) }
    idea = ticket_in(nil, "Idea", 0)

    bulk_update(ticket_ids: [ todo[0].id, idea.id ], column_id: @todo.id)

    assert_response :success
    assert_equal [ todo[1], todo[2], todo[0], idea ], @todo.tickets.reload.order(:position).to_a
    assert_equal [ 0, 1, 2, 3 ], @todo.tickets.order(:position).pluck(:position)
  end

  test "a bulk delete keeps every group dense" do
    backlog = 3.times.map { |index| ticket_in(nil, "Backlog #{index}", index) }
    todo = 4.times.map { |index| ticket_in(@todo, "Todo #{index}", index) }

    delete bulk_url, params: { bulk: { ticket_ids: [ backlog[0].id, todo[1].id, todo[2].id ] } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ 0, 1 ], backlog.drop(1).map { |ticket| ticket.reload.position }
    assert_equal [ 0, 1 ], todo.values_at(0, 3).map { |ticket| ticket.reload.position }
  end

  test "moving a ticket to the top runs the same number of queries for 1 and 10 siblings" do
    ticket_in(@todo, "Sibling", 0)
    one_moved = ticket_in(@todo, "Moved", 1)
    one = query_count { patch tickets_url(one_moved.id), params: { ticket: { position: 0 } }, headers: @headers, as: :json }

    10.times { |index| ticket_in(@doing, "Sibling #{index}", index) }
    ten_moved = ticket_in(@doing, "Moved", 10)
    ten = query_count { patch tickets_url(ten_moved.id), params: { ticket: { position: 0 } }, headers: @headers, as: :json }

    assert_equal one, ten
  end

  test "a title edit with a stale version returns EDIT_CONFLICT with the latest ticket" do
    idea = ticket_in(@todo, "Idea", 0)
    idea.update!(title: "Their idea")

    patch tickets_url(idea.id), params: { ticket: { title: "My idea", lock_version: 0 } }, headers: @headers, as: :json

    assert_response :conflict
    body = JSON.parse(response.body)
    assert_equal "EDIT_CONFLICT", body["code"]
    assert_equal [ "Their idea", 1 ], [ body["ticket"]["title"], body["ticket"]["lock_version"] ]
    assert_equal "Their idea", idea.reload.title
  end

  test "a description edit without a version returns LOCK_VERSION_REQUIRED" do
    idea = ticket_in(@todo, "Idea", 0)

    patch tickets_url(idea.id), params: { ticket: { description: "Details" } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "LOCK_VERSION_REQUIRED", JSON.parse(response.body)["code"]
    assert_nil idea.reload.description
  end

  test "a column move needs no version and bumps it" do
    idea = ticket_in(@todo, "Idea", 0)
    idea.update!(title: "Renamed")

    patch tickets_url(idea.id), params: { ticket: { column_id: @doing.id } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ @doing.id, 2 ], [ idea.reload.column_id, idea.lock_version ]
  end

  test "a title edit based on the version from before a move conflicts" do
    idea = ticket_in(@todo, "Idea", 0)
    patch tickets_url(idea.id), params: { ticket: { column_id: @doing.id } }, headers: @headers, as: :json

    patch tickets_url(idea.id), params: { ticket: { title: "My idea", lock_version: 0 } }, headers: @headers, as: :json

    assert_response :conflict
    assert_equal [ "Idea", @doing.id ], [ idea.reload.title, idea.column_id ]
  end

  test "bulk update needs no version" do
    idea = ticket_in(@todo, "Idea", 0)

    bulk_update(ticket_ids: [ idea.id ], column_id: @doing.id)

    assert_response :success
    assert_equal 0, JSON.parse(response.body)["tickets"][0]["lock_version"]
    patch tickets_url(idea.id), params: { ticket: { title: "My idea", lock_version: 0 } }, headers: @headers, as: :json
    assert_response :success
  end

  test "create returns TITLE_TOO_LONG for an over-limit title" do
    post "/teams/#{@team.code}/boards/#{@board.id}/tickets", params: { ticket: { title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1), column_id: @todo.id } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal({ "code" => "TITLE_TOO_LONG" }, JSON.parse(response.body))
  end

  test "update returns DESCRIPTION_TOO_LONG for an over-limit description" do
    ticket = Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    patch "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{ticket.id}", params: { ticket: { description: "a" * (ContentLimits::DESCRIPTION_MAX_LENGTH + 1), lock_version: 0 } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal({ "code" => "DESCRIPTION_TOO_LONG" }, JSON.parse(response.body))
  end

  def list_tickets(params)
    get tickets_url, params: params, headers: @headers
    JSON.parse(response.body)
  end

  def listed_titles(params)
    list_tickets(params)["tickets"].map { |ticket| ticket["title"] }
  end

  test "index lists the backlog or one column in position order" do
    ticket_in(nil, "Second idea", 1)
    ticket_in(nil, "First idea", 0)
    ticket_in(@todo, "Task", 0)

    assert_equal [ "First idea", "Second idea" ], listed_titles(status: "backlog")
    assert_equal [ "Task" ], listed_titles(status: @todo.id)
    assert_empty listed_titles(status: @doing.id)
  end

  test "index requires a status and a column of the board" do
    get tickets_url, headers: @headers
    assert_response :unprocessable_entity
    assert_equal({ "code" => "TICKET_STATUS_REQUIRED" }, JSON.parse(response.body))

    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    other_column = Column.create!(board: other_board, title: "Elsewhere", position: 5)
    get tickets_url, params: { status: other_column.id }, headers: @headers
    assert_response :not_found
    assert_equal({ "code" => "COLUMN_NOT_FOUND" }, JSON.parse(response.body))
  end

  test "index searches titles and descriptions" do
    ticket_in(nil, "Login bug", 0)
    ticket_in(nil, "Signup", 1).update!(description: "Breaks the login form")
    ticket_in(nil, "Unrelated", 2)

    assert_equal [ "Login bug", "Signup" ], listed_titles(status: "backlog", search: "LOGIN")
  end

  test "index filters by assignee and by unassigned" do
    bob = create_member(@team, "Bob")
    carol = create_member(@team, "Carol")
    for_bob = ticket_in(nil, "For Bob", 0)
    for_carol = ticket_in(nil, "For Carol", 1)
    ticket_in(nil, "Nobody", 2)
    TicketAssignee.create!(ticket: for_bob, user: bob)
    TicketAssignee.create!(ticket: for_bob, user: carol)
    TicketAssignee.create!(ticket: for_carol, user: carol)

    assert_equal [ "For Bob" ], listed_titles(status: "backlog", assignee_ids: [ bob.id ])
    assert_equal [ "For Bob", "For Carol" ], listed_titles(status: "backlog", assignee_ids: [ bob.id, carol.id ])
    assert_equal [ "Nobody" ], listed_titles(status: "backlog", assignee_ids: [ "none" ])
    assert_equal [ "For Bob", "Nobody" ], listed_titles(status: "backlog", assignee_ids: [ "none", bob.id ])
  end

  test "index filters by any of the given tags and by untagged, combined with the assignee filter" do
    bob = create_member(@team, "Bob")
    bug = BoardTag.create!(board: @board, name: "bug", color: "red")
    api = BoardTag.create!(board: @board, name: "api", color: "blue")
    bug_ticket = ticket_in(nil, "Bug", 0)
    api_ticket = ticket_in(nil, "Api", 1)
    untagged = ticket_in(nil, "Untagged", 2)
    TicketTag.create!(ticket: bug_ticket, tag: bug)
    TicketTag.create!(ticket: api_ticket, tag: api)
    TicketTag.create!(ticket: api_ticket, tag: bug)
    TicketAssignee.create!(ticket: api_ticket, user: bob)
    TicketAssignee.create!(ticket: untagged, user: bob)

    assert_equal [ "Bug", "Api" ], listed_titles(status: "backlog", tag_ids: [ bug.id ])
    assert_equal [ "Api" ], listed_titles(status: "backlog", tag_ids: [ api.id ])
    assert_equal [ "Untagged" ], listed_titles(status: "backlog", tag_ids: [ "none" ])
    assert_equal [ "Api", "Untagged" ], listed_titles(status: "backlog", tag_ids: [ "none", api.id ])
    assert_equal [ "Api" ], listed_titles(status: "backlog", tag_ids: [ bug.id ], assignee_ids: [ bob.id ])
  end

  test "the tag filter leaves out trashed tickets" do
    bug = BoardTag.create!(board: @board, name: "bug", color: "red")
    live = ticket_in(nil, "Live", 0)
    trashed = ticket_in(nil, "Trashed", 1)
    ticket_in(nil, "Untagged", 2)
    TicketTag.create!(ticket: live, tag: bug)
    TicketTag.create!(ticket: trashed, tag: bug)
    Trash.move_tickets(@board, [ trashed ], @user)

    assert_equal [ "Live" ], listed_titles(status: "backlog", tag_ids: [ bug.id ])
    assert_equal [ "Untagged" ], listed_titles(status: "backlog", tag_ids: [ "none" ])
  end

  test "index pages by 50 and flips has_more at the end" do
    55.times { |index| ticket_in(nil, "Ticket #{index}", index) }

    first = list_tickets(status: "backlog")
    assert_equal 50, first["tickets"].length
    assert first["has_more"]

    rest = list_tickets(status: "backlog", offset: 50)
    assert_equal (50..54).map { |index| "Ticket #{index}" }, rest["tickets"].map { |ticket| ticket["title"] }
    assert_not rest["has_more"]
  end

  test "index hides boards of projects the user can't see" do
    bob = create_member(@team, "Bob")
    @board.update!(project: Project.create!(team: @team, name: "Secret", owner: @user, creator: @user))

    get tickets_url, params: { status: "backlog" }, headers: { "Authorization" => "Bearer #{session_token(bob)}" }
    assert_response :not_found
    assert_equal({ "code" => "BOARD_NOT_FOUND" }, JSON.parse(response.body))
  end

  test "index returns FEATURE_DISABLED when boards are turned off" do
    @team.update!(boards_enabled: false)

    list_tickets(status: "backlog")
    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, JSON.parse(response.body))
  end

  test "index runs the same number of queries for 1 and 10 tickets" do
    attach_avatar(@user)
    members = 3.times.map { |index| create_member(@team, nickname_for(index), with_avatar: index.zero?) }
    tags = 3.times.map { |index| BoardTag.create!(board: @board, name: "tag #{index}", color: "grey") }
    first = ticket_in(nil, "Ticket 0", 0)
    TicketAssignee.create!(ticket: first, user: members.first)
    TicketTag.create!(ticket: first, tag: tags.first)
    one = query_count { get tickets_url, params: { status: "backlog" }, headers: @headers }

    9.times do |index|
      ticket = ticket_in(nil, "Ticket #{index + 1}", index + 1)
      TicketAssignee.create!(ticket: ticket, user: members[index % 3])
      TicketTag.create!(ticket: ticket, tag: tags[index % 3])
    end
    ten = query_count { get tickets_url, params: { status: "backlog" }, headers: @headers }

    assert_equal 10, JSON.parse(response.body)["tickets"].length
    assert_equal one, ten
  end

  test "index loads tickets without their descriptions" do
    ticket_in(nil, "Idea", 0).update!(description: "<p>Steps</p>")

    assert_empty ticket_description_selects { get tickets_url, params: { status: "backlog" }, headers: @headers }
    assert_equal [ "Idea" ], JSON.parse(response.body)["tickets"].map { |ticket| ticket["title"] }
  end
end
