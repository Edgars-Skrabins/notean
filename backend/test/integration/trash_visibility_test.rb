require "test_helper"

class TrashVisibilityTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = create_member(@team, "Alice")
    @user.memberships.first.update!(role: "owner")
    @headers = { "Authorization" => "Bearer #{session_token(@user)}" }
    @board = Board.create!(team: @team, creator: @user, title: "Launch board")
    @column = Column.create!(board: @board, title: "To Do", position: 0)
  end

  def get_json(path, params = {})
    get "/teams/#{@team.code}/#{path}", params: params, headers: @headers
    assert_response :success
    JSON.parse(response.body)
  end

  def favorite(item)
    Favorite.create!(user: @user, team: @team, favoritable: item, home_position: Favorite.count, sidebar_position: Favorite.count)
  end

  test "trashed pages, diagrams and boards leave lists, search and favorites until restored" do
    page = Page.create!(team: @team, creator: @user, title: "Launch notes", content: "")
    diagram = Diagram.create!(team: @team, creator: @user, title: "Launch flow", content: "")
    [ page, diagram, @board ].each { |item| favorite(item) }
    entries = [ page, diagram, @board ].map { |item| Trash.move(item, @user) }

    assert_empty get_json("pages")["pages"]
    assert_empty get_json("diagrams")["diagrams"]
    assert_empty get_json("boards")["boards"]
    assert get_json("search", q: "launch")["sections"].all? { |section| section["results"].empty? }
    assert_empty get_json("favorites")["favorites"]

    entries.each { |entry| Trash.restore(entry) }

    assert_equal 3, get_json("favorites")["favorites"].length
    assert_equal [ "Launch notes" ], get_json("pages")["pages"].map { |item| item["title"] }
  end

  test "trashed tickets leave the board, the tickets list and My Work" do
    ticket = Ticket.create!(board: @board, column: @column, team: @team, creator: @user, title: "Fix launch", position: 0)
    TicketAssignee.create!(ticket: ticket, user: @user)
    Trash.move_tickets(@board, [ ticket ], @user)

    assert_empty get_json("boards/#{@board.id}")["board"]["columns"].first["tickets"]
    assert_empty get_json("boards/#{@board.id}/tickets", status: @column.id)["tickets"]
    assert_empty get_json("my_work")["tickets"]
    get "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{ticket.id}", headers: @headers
    assert_response :not_found
  end

  test "a trashed folder's pages leave its level and can't be opened" do
    folder = Folder.create!(team: @team, creator: @user, title: "Docs", item_type: "Page")
    page = Page.create!(team: @team, creator: @user, title: "Inside", content: "", folder: folder)
    Trash.move(folder, @user)

    assert_empty get_json("folders", item_type: "Page")["folders"]
    get "/teams/#{@team.code}/pages/#{page.id}", headers: @headers
    assert_response :not_found
  end
end
