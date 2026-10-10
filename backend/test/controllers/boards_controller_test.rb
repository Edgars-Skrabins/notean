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

  test "show includes card summaries nested under each column" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    column = Column.create!(board: board, title: "To Do", position: 0)
    Card.create!(column: column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    get "/teams/#{@team.code}/boards/#{board.id}", headers: @headers

    assert_response :success
    cards = JSON.parse(response.body)["board"]["columns"].first["cards"]
    assert_equal [ "Fix bug" ], cards.map { |card| card["title"] }
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
end
