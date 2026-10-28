require "test_helper"

class ColumnsControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    token = session_token(@user)
    @headers = { "Authorization" => "Bearer #{token}" }
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @board.columns.destroy_all
  end

  test "create assigns the next position after existing columns" do
    Column.create!(board: @board, title: "To Do", position: 0)

    post "/teams/#{@team.code}/boards/#{@board.id}/columns", params: { column: { title: "Doing" } }, headers: @headers, as: :json

    assert_response :created
    assert_equal 1, JSON.parse(response.body)["column"]["position"]
  end

  test "create assigns the next position even after a column has been deleted" do
    first = Column.create!(board: @board, title: "To Do", position: 0)
    Column.create!(board: @board, title: "Doing", position: 1)
    first.destroy

    post "/teams/#{@team.code}/boards/#{@board.id}/columns", params: { column: { title: "Done" } }, headers: @headers, as: :json

    assert_response :created
    assert_equal 2, JSON.parse(response.body)["column"]["position"]
  end

  test "update renames a column without changing its position" do
    column = Column.create!(board: @board, title: "To Do", position: 0)

    patch "/teams/#{@team.code}/boards/#{@board.id}/columns/#{column.id}",
      params: { column: { title: "Backlog" } },
      headers: @headers,
      as: :json

    assert_response :success
    column.reload
    assert_equal "Backlog", column.title
    assert_equal 0, column.position
  end

  test "destroy removes the column and moves each of its tickets to the trash" do
    column = Column.create!(board: @board, title: "To Do", position: 0)
    tickets = Array.new(2) { |index| Ticket.create!(board: @board, column: column, team: @team, creator: @user, title: "Ticket #{index}", position: index) }

    delete "/teams/#{@team.code}/boards/#{@board.id}/columns/#{column.id}", headers: @headers

    assert_response :success
    assert_nil Column.find_by(id: column.id)
    entries = TrashEntry.where(item_type: "Ticket").order(:id)
    assert_equal entries.map(&:id), JSON.parse(response.body)["trash_entry_ids"]
    assert_equal tickets.map(&:id), entries.map(&:item_id)
    assert_equal [ nil, nil ], Ticket.unscoped.where(id: tickets.map(&:id)).pluck(:column_id)
    assert_equal [ "tickets_removed", "columns_changed" ], board_broadcasts(@board).map { |message| message["type"] }
  end

  test "returns FEATURE_DISABLED when boards are turned off" do
    @team.update!(boards_enabled: false)

    post "/teams/#{@team.code}/boards/#{@board.id}/columns", params: { column: { title: "Doing" } }, headers: @headers, as: :json

    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, JSON.parse(response.body))
    assert_equal 0, @board.columns.count
  end

  test "create, rename and destroy broadcast the board's columns" do
    todo = Column.create!(board: @board, title: "To Do", position: 0)
    columns_url = "/teams/#{@team.code}/boards/#{@board.id}/columns"

    post columns_url, params: { column: { title: "Doing" } }, headers: @headers, as: :json
    doing_id = JSON.parse(response.body)["column"]["id"]
    assert_broadcast_on(BoardChannel.stream_name(@board), type: "columns_changed", columns: [
      { id: todo.id, title: "To Do", position: 0 },
      { id: doing_id, title: "Doing", position: 1 }
    ])

    patch "#{columns_url}/#{todo.id}", params: { column: { title: "Next" } }, headers: @headers, as: :json
    assert_broadcast_on(BoardChannel.stream_name(@board), type: "columns_changed", columns: [
      { id: todo.id, title: "Next", position: 0 },
      { id: doing_id, title: "Doing", position: 1 }
    ])

    delete "#{columns_url}/#{todo.id}", headers: @headers
    assert_broadcast_on(BoardChannel.stream_name(@board), type: "columns_changed", columns: [ { id: doing_id, title: "Doing", position: 1 } ])
  end

  test "update returns TITLE_TOO_LONG for an over-limit title" do
    column = Column.create!(board: @board, title: "To Do", position: 0)

    patch "/teams/#{@team.code}/boards/#{@board.id}/columns/#{column.id}", params: { column: { title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1) } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal({ "code" => "TITLE_TOO_LONG" }, JSON.parse(response.body))
  end

  test "destroy leaves an item deleted notice for the owners of the trashed tickets" do
    bob = create_member(@team, "Bob")
    column = Column.create!(board: @board, title: "To Do", position: 0)
    Ticket.create!(board: @board, column: column, team: @team, creator: bob, title: "Bug", position: 0)

    delete "/teams/#{@team.code}/boards/#{@board.id}/columns/#{column.id}", headers: @headers

    assert_response :success
    assert_equal [ [ bob.id, "item_deleted", "Bug" ] ], Notification.pluck(:user_id, :kind, :item_title)
  end
end
