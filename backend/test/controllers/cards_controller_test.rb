require "test_helper"

class CardsControllerTest < ActionDispatch::IntegrationTest
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
    Card.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Existing", position: 0)

    post "/teams/#{@team.code}/boards/#{@board.id}/cards",
      params: { card: { title: "Fix bug", column_id: @todo.id } },
      headers: @headers,
      as: :json

    assert_response :created
    assert_equal 1, JSON.parse(response.body)["card"]["position"]
  end

  test "create assigns position 0 to the first card in an empty column" do
    post "/teams/#{@team.code}/boards/#{@board.id}/cards",
      params: { card: { title: "Fix bug", column_id: @todo.id } },
      headers: @headers,
      as: :json

    assert_response :created
    assert_equal 0, JSON.parse(response.body)["card"]["position"]
  end

  test "create defaults a blank title to Untitled" do
    post "/teams/#{@team.code}/boards/#{@board.id}/cards",
      params: { card: { title: "", column_id: @todo.id } },
      headers: @headers,
      as: :json

    assert_response :created
    assert_equal "Untitled", JSON.parse(response.body)["card"]["title"]
  end

  test "create sets team_id from the url, ignoring any team_id in the body" do
    other_team = Team.create!(name: "Other", password: "supersecret")

    post "/teams/#{@team.code}/boards/#{@board.id}/cards",
      params: { card: { title: "Fix bug", column_id: @todo.id, team_id: other_team.id } },
      headers: @headers,
      as: :json

    assert_response :created
    assert_equal @team.id, Card.last.team_id
  end

  test "create rejects a column that does not belong to this board" do
    other_board = Board.create!(team: @team, creator: @user, title: "Backlog")
    foreign_column = Column.create!(board: other_board, title: "To Do", position: 0)

    post "/teams/#{@team.code}/boards/#{@board.id}/cards",
      params: { card: { title: "Fix bug", column_id: foreign_column.id } },
      headers: @headers,
      as: :json

    assert_response :not_found
  end

  test "show returns the card" do
    card = Card.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    get "/teams/#{@team.code}/boards/#{@board.id}/cards/#{card.id}", headers: @headers

    assert_response :success
    assert_equal "Fix bug", JSON.parse(response.body)["card"]["title"]
    assert_equal "alice", JSON.parse(response.body)["card"]["creator"]["nickname"]
  end

  test "update renames a card and edits its description without touching position" do
    card = Card.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    patch "/teams/#{@team.code}/boards/#{@board.id}/cards/#{card.id}",
      params: { card: { title: "Fix the bug", description: "Steps to reproduce..." } },
      headers: @headers,
      as: :json

    assert_response :success
    card.reload
    assert_equal "Fix the bug", card.title
    assert_equal "Steps to reproduce...", card.description
    assert_equal 0, card.position
    assert_equal @todo.id, card.column_id
  end

  test "move within the same column reindexes siblings contiguously" do
    first = Card.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "First", position: 0)
    second = Card.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Second", position: 1)
    third = Card.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Third", position: 2)

    patch "/teams/#{@team.code}/boards/#{@board.id}/cards/#{third.id}",
      params: { card: { column_id: @todo.id, position: 0 } },
      headers: @headers,
      as: :json

    assert_response :success
    ordered = @todo.cards.reload.order(:position)
    assert_equal [ third.id, first.id, second.id ], ordered.pluck(:id)
    assert_equal [ 0, 1, 2 ], ordered.pluck(:position)
  end

  test "move across columns reindexes the destination and leaves a harmless gap in the source" do
    first = Card.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "First", position: 0)
    second = Card.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Second", position: 1)
    existing = Card.create!(column: @doing, team: @team, created_by_user_id: @user.id, title: "Existing", position: 0)

    patch "/teams/#{@team.code}/boards/#{@board.id}/cards/#{first.id}",
      params: { card: { column_id: @doing.id, position: 0 } },
      headers: @headers,
      as: :json

    assert_response :success
    assert_equal @doing.id, first.reload.column_id

    destination = @doing.cards.reload.order(:position)
    assert_equal [ first.id, existing.id ], destination.pluck(:id)
    assert_equal [ 0, 1 ], destination.pluck(:position)

    source = @todo.cards.reload
    assert_equal [ second.id ], source.pluck(:id)
    assert_equal [ 1 ], source.pluck(:position)
  end

  test "move rejects a target column that does not belong to this board" do
    other_board = Board.create!(team: @team, creator: @user, title: "Backlog")
    foreign_column = Column.create!(board: other_board, title: "To Do", position: 0)
    card = Card.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    patch "/teams/#{@team.code}/boards/#{@board.id}/cards/#{card.id}",
      params: { card: { column_id: foreign_column.id } },
      headers: @headers,
      as: :json

    assert_response :not_found
  end

  test "destroy removes the card" do
    card = Card.create!(column: @todo, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    delete "/teams/#{@team.code}/boards/#{@board.id}/cards/#{card.id}", headers: @headers

    assert_response :no_content
    assert_nil Card.find_by(id: card.id)
  end

  test "non-members cannot access a board's cards" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")
    token = JsonWebToken.encode(user_id: outsider.id)

    get "/teams/#{@team.code}/boards/#{@board.id}/cards/1", headers: { "Authorization" => "Bearer #{token}" }

    assert_response :forbidden
  end
end
