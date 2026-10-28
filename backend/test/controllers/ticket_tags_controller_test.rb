require "test_helper"

class TicketTagsControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)
    @bug = BoardTag.create!(board: @board, name: "bug", color: "red")
    @headers = { "Authorization" => "Bearer #{session_token(@user)}" }
  end

  def ticket_tags_url(tag_id = nil)
    [ "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{@ticket.id}/tags", tag_id ].compact.join("/")
  end

  test "create tags the ticket, returns its tag ids sorted by name and broadcasts it" do
    api = BoardTag.create!(board: @board, name: "api", color: "blue")
    TicketTag.create!(ticket: @ticket, tag: @bug)

    post ticket_tags_url, params: { tag: { tag_id: api.id } }, headers: @headers, as: :json

    assert_response :created
    assert_equal [ api.id, @bug.id ], JSON.parse(response.body)["ticket"]["tag_ids"]
    message = board_broadcasts(@board).sole
    assert_equal [ "tickets_upserted", [ api.id, @bug.id ] ], [ message["type"], message["tickets"].sole["tag_ids"] ]
  end

  test "tagging twice returns 200 without a duplicate" do
    TicketTag.create!(ticket: @ticket, tag: @bug)

    post ticket_tags_url, params: { tag: { tag_id: @bug.id } }, headers: @headers, as: :json

    assert_response :ok
    assert_equal 1, @ticket.ticket_tags.count
  end

  test "a tag from another board returns TAG_NOT_FOUND" do
    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    other_tag = BoardTag.create!(board: other_board, name: "bug", color: "red")

    post ticket_tags_url, params: { tag: { tag_id: other_tag.id } }, headers: @headers, as: :json

    assert_response :not_found
    assert_equal "TAG_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "create stops at 10 tags per ticket" do
    Ticket::MAX_TAGS.times { |index| TicketTag.create!(ticket: @ticket, tag: BoardTag.create!(board: @board, name: "tag #{index}", color: "grey")) }

    post ticket_tags_url, params: { tag: { tag_id: @bug.id } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "TICKET_TAG_LIMIT_REACHED", JSON.parse(response.body)["code"]
  end

  test "adding and removing tags keep the ticket's lock version" do
    post ticket_tags_url, params: { tag: { tag_id: @bug.id } }, headers: @headers, as: :json
    assert_equal 0, JSON.parse(response.body)["ticket"]["lock_version"]

    delete ticket_tags_url(@bug.id), headers: @headers

    assert_response :success
    ticket = JSON.parse(response.body)["ticket"]
    assert_equal [ [], 0 ], ticket.values_at("tag_ids", "lock_version")
    assert_equal 0, @ticket.reload.lock_version
  end

  test "removing a tag the ticket doesn't carry returns TAG_NOT_FOUND" do
    delete ticket_tags_url(@bug.id), headers: @headers

    assert_response :not_found
    assert_equal "TAG_NOT_FOUND", JSON.parse(response.body)["code"]
  end
end
