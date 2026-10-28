require "test_helper"

class TicketAssigneesControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    @bob = create_member(@team, "Bob")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)
    @headers = { "Authorization" => "Bearer #{session_token(@user)}" }
  end

  def assignees_url(ticket: @ticket, board: @board)
    "/teams/#{@team.code}/boards/#{board.id}/tickets/#{ticket.id}/assignees"
  end

  test "create assigns a team member and returns the ticket with its assignees" do
    post assignees_url, params: { assignee: { user_id: @bob.id } }, headers: @headers, as: :json

    assert_response :created
    assignees = JSON.parse(response.body)["ticket"]["assignees"]
    assert_equal [ [ @bob.id, "Bob" ] ], assignees.map { |assignee| [ assignee["id"], assignee["nickname"] ] }
    assert assignees.first.key?("avatar")
  end

  test "assigning someone twice returns 200 without a duplicate" do
    TicketAssignee.create!(ticket: @ticket, user: @bob)

    post assignees_url, params: { assignee: { user_id: @bob.id } }, headers: @headers, as: :json

    assert_response :ok
    assert_equal 1, @ticket.ticket_assignees.count
  end

  test "create rejects someone outside the team" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    post assignees_url, params: { assignee: { user_id: outsider.id } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "ASSIGNEE_NOT_TEAM_MEMBER", JSON.parse(response.body)["code"]
  end

  test "destroy unassigns the user" do
    TicketAssignee.create!(ticket: @ticket, user: @bob)

    delete "#{assignees_url}/#{@bob.id}", headers: @headers

    assert_response :success
    assert_equal [], JSON.parse(response.body)["ticket"]["assignees"]
  end

  test "destroy returns ASSIGNEE_NOT_FOUND when the user is not assigned" do
    delete "#{assignees_url}/#{@bob.id}", headers: @headers

    assert_response :not_found
    assert_equal "ASSIGNEE_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "assigning and unassigning keep the lock version and refresh updated_at" do
    travel_to 1.hour.from_now do
      post assignees_url, params: { assignee: { user_id: @bob.id } }, headers: @headers, as: :json

      assert_response :created
      assert_equal 0, JSON.parse(response.body)["ticket"]["lock_version"]
      assert_in_delta Time.current, @ticket.reload.updated_at, 1.second

      travel 1.hour
      delete "#{assignees_url}/#{@bob.id}", headers: @headers

      assert_response :success
      assert_equal 0, JSON.parse(response.body)["ticket"]["lock_version"]
      assert_in_delta Time.current, @ticket.reload.updated_at, 1.second
    end
  end

  test "a description save with the version from before an assign succeeds" do
    post assignees_url, params: { assignee: { user_id: @bob.id } }, headers: @headers, as: :json

    patch "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{@ticket.id}", params: { ticket: { description: "Steps to reproduce", lock_version: 0 } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ "Steps to reproduce", [ @bob.id ] ], [ @ticket.reload.description, @ticket.assignees.map(&:id) ]
  end

  test "a caller outside the team gets NOT_TEAM_MEMBER" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    post assignees_url, params: { assignee: { user_id: @bob.id } }, headers: { "Authorization" => "Bearer #{session_token(outsider)}" }, as: :json

    assert_response :forbidden
    assert_equal "NOT_TEAM_MEMBER", JSON.parse(response.body)["code"]
  end

  test "a ticket from another board returns TICKET_NOT_FOUND" do
    other_board = Board.create!(team: @team, creator: @user, title: "Other")

    post assignees_url(board: other_board), params: { assignee: { user_id: @bob.id } }, headers: @headers, as: :json

    assert_response :not_found
    assert_equal "TICKET_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "returns FEATURE_DISABLED when boards are turned off" do
    @team.update!(boards_enabled: false)

    post assignees_url, params: { assignee: { user_id: @bob.id } }, headers: @headers, as: :json

    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, JSON.parse(response.body))
    assert_empty @ticket.ticket_assignees
  end

  test "create broadcasts the ticket with its new assignee" do
    post assignees_url, params: { assignee: { user_id: @bob.id } }, headers: @headers, as: :json

    assert_response :created
    assert_broadcast_on(BoardChannel.stream_name(@board), type: "tickets_upserted", tickets: [ ticket_broadcast_json(JSON.parse(response.body)["ticket"]) ])
  end

  test "destroy broadcasts the ticket without the removed assignee" do
    TicketAssignee.create!(ticket: @ticket, user: @bob)

    delete "#{assignees_url}/#{@bob.id}", headers: @headers

    assert_response :success
    assert_broadcast_on(BoardChannel.stream_name(@board), type: "tickets_upserted", tickets: [ ticket_broadcast_json(JSON.parse(response.body)["ticket"]) ])
  end

  test "assigning and unassigning notify the member once" do
    post assignees_url, params: { assignee: { user_id: @bob.id } }, headers: @headers, as: :json
    post assignees_url, params: { assignee: { user_id: @bob.id } }, headers: @headers, as: :json
    delete "#{assignees_url}/#{@bob.id}", headers: @headers

    assert_equal %w[assigned unassigned], Notification.where(user: @bob).order(:id).pluck(:kind)
  end
end
