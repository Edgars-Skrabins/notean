require "test_helper"

class ColumnsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    token = JsonWebToken.encode(user_id: @user.id)
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

  test "destroy removes the column" do
    column = Column.create!(board: @board, title: "To Do", position: 0)

    delete "/teams/#{@team.code}/boards/#{@board.id}/columns/#{column.id}", headers: @headers

    assert_response :no_content
    assert_nil Column.find_by(id: column.id)
  end

  test "returns FEATURE_DISABLED when boards are turned off" do
    @team.update!(boards_enabled: false)

    post "/teams/#{@team.code}/boards/#{@board.id}/columns", params: { column: { title: "Doing" } }, headers: @headers, as: :json

    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, JSON.parse(response.body))
    assert_equal 0, @board.columns.count
  end

  test "update returns TITLE_TOO_LONG for an over-limit title" do
    column = Column.create!(board: @board, title: "To Do", position: 0)

    patch "/teams/#{@team.code}/boards/#{@board.id}/columns/#{column.id}", params: { column: { title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1) } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal({ "code" => "TITLE_TOO_LONG" }, JSON.parse(response.body))
  end
end
