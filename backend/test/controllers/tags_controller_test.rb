require "test_helper"

class TagsControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    @headers = { "Authorization" => "Bearer #{session_token(@user)}" }
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
  end

  def tags_url(id = nil)
    [ "/teams/#{@team.code}/boards/#{@board.id}/tags", id ].compact.join("/")
  end

  def create_tag(name, color = "blue")
    BoardTag.create!(board: @board, name: name, color: color)
  end

  def tagged_ticket(tag, title = "Fix bug")
    ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: title, position: 0)
    TicketTag.create!(ticket: ticket, tag: tag)
    ticket
  end

  test "create trims the name and defaults to the least used colour" do
    create_tag("frontend", "grey")

    post tags_url, params: { tag: { name: "  bug " } }, headers: @headers, as: :json

    assert_response :created
    assert_equal [ "bug", "blue", 0 ], JSON.parse(response.body)["tag"].values_at("name", "color", "ticket_count")
  end

  test "create rejects a name already used on the board, ignoring case" do
    create_tag("Bug")

    post tags_url, params: { tag: { name: "bug" } }, headers: @headers, as: :json

    assert_response :conflict
    assert_equal "TAG_NAME_TAKEN", JSON.parse(response.body)["code"]
  end

  test "create rejects a name over 24 characters" do
    post tags_url, params: { tag: { name: "a" * 25 } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "TAG_SAVE_FAILED", JSON.parse(response.body)["code"]
  end

  test "create stops at 100 tags per board" do
    BoardTag::MAX_PER_BOARD.times { |index| create_tag("tag #{index}") }

    post tags_url, params: { tag: { name: "one more" } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "TAG_LIMIT_REACHED", JSON.parse(response.body)["code"]
  end

  test "update renames and recolours a tag and returns the board's tags sorted by name with counts" do
    bug = create_tag("bug")
    create_tag("api")
    tagged_ticket(bug)

    patch tags_url(bug.id), params: { tag: { name: "zebra", color: "purple" } }, headers: @headers, as: :json

    assert_response :success
    tags = JSON.parse(response.body)["tags"]
    assert_equal [ [ "api", "blue", 0 ], [ "zebra", "purple", 1 ] ], tags.map { |tag| tag.values_at("name", "color", "ticket_count") }
    assert_broadcast_on(BoardChannel.stream_name(@board), type: "tags_changed", tags: tags)
  end

  test "tag counts leave out trashed tickets" do
    bug = create_tag("bug")
    tagged_ticket(bug, "Live")
    Trash.move_tickets(@board, [ tagged_ticket(bug, "Trashed") ], @user)

    patch tags_url(bug.id), params: { tag: { name: "bug" } }, headers: @headers, as: :json

    assert_equal [ 1 ], JSON.parse(response.body)["tags"].map { |tag| tag["ticket_count"] }
  end

  test "destroy removes the tag from its tickets and broadcasts them" do
    bug = create_tag("bug")
    ticket = tagged_ticket(bug)
    tagged_ticket(create_tag("api"), "Other")

    delete tags_url(bug.id), headers: @headers

    assert_response :success
    assert_equal [ "api" ], JSON.parse(response.body)["tags"].map { |tag| tag["name"] }
    assert_empty ticket.reload.tags
    message = board_broadcasts(@board).sole
    assert_equal "tags_changed", message["type"]
    assert_equal [ [ ticket.id, [] ] ], message["tickets"].map { |item| [ item["id"], item["tag_ids"] ] }
  end

  test "a tag from another board returns TAG_NOT_FOUND" do
    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    other_tag = BoardTag.create!(board: other_board, name: "bug", color: "red")

    delete tags_url(other_tag.id), headers: @headers

    assert_response :not_found
    assert_equal "TAG_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "boards of projects the user can't see return BOARD_NOT_FOUND" do
    bob = create_member(@team, "Bob")
    @board.update!(project: Project.create!(team: @team, name: "Secret", owner: @user, creator: @user))

    post tags_url, params: { tag: { name: "bug" } }, headers: { "Authorization" => "Bearer #{session_token(bob)}" }, as: :json

    assert_response :not_found
    assert_equal "BOARD_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "returns FEATURE_DISABLED when boards are turned off" do
    @team.update!(boards_enabled: false)

    post tags_url, params: { tag: { name: "bug" } }, headers: @headers, as: :json

    assert_response :forbidden
    assert_equal "FEATURE_DISABLED", JSON.parse(response.body)["code"]
    assert_equal 0, @board.tags.count
  end
end
