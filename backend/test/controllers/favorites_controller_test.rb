require "test_helper"

class FavoritesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    token = session_token(@user)
    @headers = { "Authorization" => "Bearer #{token}" }
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
    @diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: "")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @column = Column.create!(board: @board, title: "To Do", position: 0)
    @ticket = Ticket.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)
  end

  def favorite(item, home_position, sidebar_position, user: @user, team: @team)
    Favorite.create!(user: user, team: team, favoritable: item, home_position: home_position, sidebar_position: sidebar_position)
  end

  test "index returns only the current user's favorites in this team, in home order, with ticket board fields" do
    bob = User.create!(email: "bob@example.com", password: "supersecret")
    Membership.create!(user: bob, team: @team, role: "user", nickname: "bob")
    other_team = Team.create!(name: "Other", password: "supersecret")
    Membership.create!(user: @user, team: other_team, role: "owner", nickname: "alice")
    other_page = Page.create!(team: other_team, creator: @user, title: "Elsewhere", content: "")
    ticket_favorite = favorite(@ticket, 0, 1)
    page_favorite = favorite(@page, 1, 0)
    favorite(@diagram, 0, 0, user: bob)
    favorite(other_page, 0, 0, team: other_team)

    get "/teams/#{@team.code}/favorites", headers: @headers

    assert_response :success
    favorites = JSON.parse(response.body)["favorites"]
    assert_equal [ ticket_favorite.id, page_favorite.id ], favorites.map { |f| f["id"] }
    assert_equal "Fix bug", favorites[0]["title"]
    assert_equal @board.id, favorites[0]["board_id"]
    assert_equal "Sprint 12", favorites[0]["board_title"]
    assert_equal "Notes", favorites[1]["title"]
    assert_not favorites[1].key?("board_id")
  end

  test "create favorites a page, a diagram, a board and a ticket" do
    [ [ "Page", @page ], [ "Diagram", @diagram ], [ "Board", @board ], [ "Ticket", @ticket ] ].each do |type, item|
      post "/teams/#{@team.code}/favorites",
        params: { favorite: { favoritable_type: type, favoritable_id: item.id } },
        headers: @headers,
        as: :json

      assert_response :created
      body = JSON.parse(response.body)["favorite"]
      assert_equal type, body["favoritable_type"]
      assert_equal item.id, body["favoritable_id"]
      assert_equal item.title, body["title"]
    end

    assert_equal 4, @user.favorites.count
  end

  test "create on an already favorited item returns 200 with the existing favorite and no duplicate" do
    existing = favorite(@page, 0, 0)

    post "/teams/#{@team.code}/favorites",
      params: { favorite: { favoritable_type: "Page", favoritable_id: @page.id } },
      headers: @headers,
      as: :json

    assert_response :success
    assert_equal existing.id, JSON.parse(response.body)["favorite"]["id"]
    assert_equal 1, @user.favorites.count
  end

  test "create puts the new favorite first in both orders" do
    favorite(@page, 0, 2)
    favorite(@diagram, 3, 0)

    post "/teams/#{@team.code}/favorites",
      params: { favorite: { favoritable_type: "Board", favoritable_id: @board.id } },
      headers: @headers,
      as: :json

    assert_response :created
    favorites = @user.favorites.where(team: @team)
    assert_equal @board.id, favorites.order(:home_position).first.favoritable_id
    assert_equal @board.id, favorites.order(:sidebar_position).first.favoritable_id
  end

  test "create rejects an item from another team with 404" do
    other_team = Team.create!(name: "Other", password: "supersecret")
    other_page = Page.create!(team: other_team, creator: @user, title: "Elsewhere", content: "")

    post "/teams/#{@team.code}/favorites",
      params: { favorite: { favoritable_type: "Page", favoritable_id: other_page.id } },
      headers: @headers,
      as: :json

    assert_response :not_found
    assert_equal 0, Favorite.count
  end

  test "create rejects an unknown type with 422" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Runbooks")

    post "/teams/#{@team.code}/favorites",
      params: { favorite: { favoritable_type: "Folder", favoritable_id: folder.id } },
      headers: @headers,
      as: :json

    assert_response :unprocessable_entity
    assert_equal 0, Favorite.count
  end

  test "move within home reindexes home order and leaves sidebar order unchanged" do
    first = favorite(@page, 0, 2)
    second = favorite(@diagram, 1, 1)
    third = favorite(@board, 2, 0)

    patch "/teams/#{@team.code}/favorites/#{third.id}",
      params: { favorite: { surface: "home", position: 0 } },
      headers: @headers,
      as: :json

    assert_response :success
    assert_equal [ third.id, first.id, second.id ], Favorite.order(:home_position).pluck(:id)
    assert_equal [ 0, 1, 2 ], Favorite.order(:home_position).pluck(:home_position)
    assert_equal [ 2, 1, 0 ], [ first, second, third ].map { |f| f.reload.sidebar_position }
  end

  test "move within sidebar reindexes sidebar order and leaves home order unchanged" do
    first = favorite(@page, 0, 0)
    second = favorite(@diagram, 1, 1)
    third = favorite(@board, 2, 2)

    patch "/teams/#{@team.code}/favorites/#{first.id}",
      params: { favorite: { surface: "sidebar", position: 2 } },
      headers: @headers,
      as: :json

    assert_response :success
    assert_equal [ second.id, third.id, first.id ], Favorite.order(:sidebar_position).pluck(:id)
    assert_equal [ 0, 1, 2 ], Favorite.order(:sidebar_position).pluck(:sidebar_position)
    assert_equal [ 0, 1, 2 ], [ first, second, third ].map { |f| f.reload.home_position }
  end

  test "move rejects an invalid surface with 422" do
    favorite = favorite(@page, 0, 0)

    patch "/teams/#{@team.code}/favorites/#{favorite.id}",
      params: { favorite: { surface: "header", position: 0 } },
      headers: @headers,
      as: :json

    assert_response :unprocessable_entity
  end

  test "destroy removes the favorite" do
    favorite = favorite(@page, 0, 0)

    delete "/teams/#{@team.code}/favorites/#{favorite.id}", headers: @headers

    assert_response :no_content
    assert_nil Favorite.find_by(id: favorite.id)
  end

  test "another user's favorite is 404 for update and destroy" do
    bob = User.create!(email: "bob@example.com", password: "supersecret")
    Membership.create!(user: bob, team: @team, role: "user", nickname: "bob")
    bobs_favorite = favorite(@page, 0, 0, user: bob)

    patch "/teams/#{@team.code}/favorites/#{bobs_favorite.id}",
      params: { favorite: { surface: "home", position: 0 } },
      headers: @headers,
      as: :json

    assert_response :not_found

    delete "/teams/#{@team.code}/favorites/#{bobs_favorite.id}", headers: @headers

    assert_response :not_found
    assert Favorite.exists?(bobs_favorite.id)
  end

  test "a non-member gets 403" do
    other_team = Team.create!(name: "Other", password: "supersecret")

    get "/teams/#{other_team.code}/favorites", headers: @headers

    assert_response :forbidden
  end

  test "index runs the same number of queries for 4 and 10 favorites" do
    favorite(@page, 0, 0)
    favorite(@diagram, 1, 1)
    favorite(@board, 2, 2)
    favorite(@ticket, 3, 3)
    four = query_count { get "/teams/#{@team.code}/favorites", headers: @headers }

    6.times do |index|
      page = Page.create!(team: @team, creator: @user, title: "Page #{index}", content: "")
      favorite(page, 4 + index, 4 + index)
    end
    ten = query_count { get "/teams/#{@team.code}/favorites", headers: @headers }

    assert_equal 10, JSON.parse(response.body)["favorites"].length
    assert_equal four, ten
  end

  test "index reports whether a ticket is in the backlog" do
    backlog_ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "Idea", position: 0)
    favorite(@ticket, 0, 0)
    favorite(backlog_ticket, 1, 1)

    get "/teams/#{@team.code}/favorites", headers: @headers

    favorites = JSON.parse(response.body)["favorites"]
    assert_equal [ false, true ], favorites.map { |favorite| favorite["in_backlog"] }
    assert_equal [ @board.id, @board.id ], favorites.map { |favorite| favorite["board_id"] }
  end

  test "index leaves out favorites whose feature is turned off, tickets following boards" do
    page_favorite = favorite(@page, 0, 0)
    diagram_favorite = favorite(@diagram, 1, 1)
    favorite(@board, 2, 2)
    favorite(@ticket, 3, 3)
    @team.update!(boards_enabled: false)

    get "/teams/#{@team.code}/favorites", headers: @headers
    assert_response :success
    assert_equal [ page_favorite.id, diagram_favorite.id ], JSON.parse(response.body)["favorites"].map { |f| f["id"] }

    @team.update!(boards_enabled: true, pages_enabled: false)

    get "/teams/#{@team.code}/favorites", headers: @headers
    assert_equal %w[Diagram Board Ticket], JSON.parse(response.body)["favorites"].map { |f| f["favoritable_type"] }
    assert_equal 4, Favorite.where(team: @team).count
  end
end
