require "test_helper"

class TicketsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    token = JsonWebToken.encode(user_id: @user.id)
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
      params: { ticket: { title: "Fix the bug", description: "Steps to reproduce..." } },
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

  test "move across columns reindexes the destination and leaves a harmless gap in the source" do
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
    assert_equal [ 1 ], source.pluck(:position)
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

  test "destroy removes the ticket" do
    ticket = Ticket.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    delete "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{ticket.id}", headers: @headers

    assert_response :no_content
    assert_nil Ticket.find_by(id: ticket.id)
  end

  test "non-members cannot access a board's tickets" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")
    token = JsonWebToken.encode(user_id: outsider.id)

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

    assert_response :no_content
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
end
