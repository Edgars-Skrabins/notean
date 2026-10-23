require "test_helper"

class PrioritiesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    @headers = { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: @user.id)}" }
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
  end

  def priorities_url(id = nil)
    [ "/teams/#{@team.code}/boards/#{@board.id}/priorities", id ].compact.join("/")
  end

  def priority_named(name)
    @board.priorities.find_by!(name: name)
  end

  def names
    @board.priorities.reload.map(&:name)
  end

  def ticket_with(priority, title = "Fix bug")
    Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: title, position: 0, priority: priority)
  end

  test "create appends a priority at the end" do
    post priorities_url, params: { priority: { name: "New priority", color: "grey" } }, headers: @headers, as: :json

    assert_response :created
    priority = JSON.parse(response.body)["priority"]
    assert_equal [ "New priority", "grey", 5, 0 ], priority.values_at("name", "color", "position", "ticket_count")
    assert_equal "New priority", names.last
  end

  test "create rejects a name already used on the board, ignoring case" do
    post priorities_url, params: { priority: { name: "high", color: "red" } }, headers: @headers, as: :json

    assert_response :conflict
    assert_equal "PRIORITY_NAME_TAKEN", JSON.parse(response.body)["code"]
  end

  test "create rejects a blank name or an unknown colour" do
    post priorities_url, params: { priority: { name: "", color: "red" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "PRIORITY_SAVE_FAILED", JSON.parse(response.body)["code"]

    post priorities_url, params: { priority: { name: "Urgent", color: "pink" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "update renames and recolours a priority and returns the board's priorities" do
    patch priorities_url(priority_named("High").id), params: { priority: { name: "Urgent", color: "purple" } }, headers: @headers, as: :json

    assert_response :success
    priorities = JSON.parse(response.body)["priorities"]
    assert_equal [ "Urgent", "purple" ], priorities[3].values_at("name", "color")
    assert_equal 5, priorities.length
  end

  test "update reorders and keeps positions contiguous" do
    patch priorities_url(priority_named("Very high").id), params: { priority: { position: 0 } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ "Very high", "Very low", "Low", "Medium", "High" ], JSON.parse(response.body)["priorities"].map { |priority| priority["name"] }
    assert_equal [ 0, 1, 2, 3, 4 ], @board.priorities.reload.map(&:position)
  end

  test "a failed rename does not reorder anything" do
    patch priorities_url(priority_named("Low").id), params: { priority: { name: "High", position: 0 } }, headers: @headers, as: :json

    assert_response :conflict
    assert_equal [ "Very low", "Low", "Medium", "High", "Very high" ], names
  end

  test "destroy clears the priority from its tickets and reindexes the rest" do
    ticket = ticket_with(priority_named("Medium"))

    delete priorities_url(priority_named("Medium").id), headers: @headers

    assert_response :success
    priorities = JSON.parse(response.body)["priorities"]
    assert_equal [ "Very low", "Low", "High", "Very high" ], priorities.map { |priority| priority["name"] }
    assert_equal [ 0, 1, 2, 3 ], priorities.map { |priority| priority["position"] }
    assert_nil ticket.reload.priority_id
  end

  test "ticket counts reflect the tickets using each priority" do
    2.times { |index| ticket_with(priority_named("High"), "Bug #{index}") }

    patch priorities_url(priority_named("Low").id), params: { priority: { color: "teal" } }, headers: @headers, as: :json

    counts = JSON.parse(response.body)["priorities"].to_h { |priority| [ priority["name"], priority["ticket_count"] ] }
    assert_equal 2, counts["High"]
    assert_equal 0, counts["Low"]
  end

  test "a priority from another board returns PRIORITY_NOT_FOUND" do
    other_board = Board.create!(team: @team, creator: @user, title: "Other")

    patch priorities_url(other_board.priorities.first.id), params: { priority: { name: "Mine" } }, headers: @headers, as: :json

    assert_response :not_found
    assert_equal "PRIORITY_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "non-members cannot manage a board's priorities" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    post priorities_url, params: { priority: { name: "Urgent", color: "red" } },
      headers: { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: outsider.id)}" }, as: :json

    assert_response :forbidden
  end
end
