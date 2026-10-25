require "test_helper"

class ProjectVisibilityTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @owner, team: @team, role: "owner", nickname: "Alice")
    @member = create_member(@team, "Bob")
    @game = Project.create!(team: @team, name: "Game", owner: @owner, creator: @owner)
    @game.project_members.create!(user: @member)
    @secret = Project.create!(team: @team, name: "Secret", owner: @owner, creator: @owner)
  end

  def headers_for(user)
    { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: user.id)}" }
  end

  def get_json(path, user: @member, params: {})
    get "/teams/#{@team.code}/#{path}", params: params, headers: headers_for(user)
    JSON.parse(response.body)
  end

  def item(kind, title, project: nil, folder: nil)
    attributes = { team: @team, creator: @owner, title: title, project: project }
    case kind
    when :pages then Page.create!(**attributes, content: "", folder: folder)
    when :diagrams then Diagram.create!(**attributes, content: "", folder: folder)
    when :boards then Board.create!(**attributes)
    end
  end

  %i[pages diagrams boards].each do |kind|
    key = kind.to_s.singularize

    test "#{kind}: hidden items are absent from lists and return not found" do
      item(kind, "Open")
      item(kind, "Game item", project: @game)
      hidden = item(kind, "Secret item", project: @secret)

      assert_equal [ "Game item", "Open" ], get_json(kind.to_s)[kind.to_s].map { |entry| entry["title"] }.sort
      get_json("#{kind}/#{hidden.id}")
      assert_response :not_found
    end

    test "#{kind}: a project filter shows only that project's items and projectless ones only under All" do
      item(kind, "Open")
      item(kind, "Game item", project: @game)

      assert_equal [ "Game item" ], get_json(kind.to_s, params: { project_id: @game.id })[kind.to_s].map { |entry| entry["title"] }
      get_json(kind.to_s, params: { project_id: @secret.id })
      assert_response :not_found
      assert_equal "PROJECT_NOT_FOUND", JSON.parse(response.body)["code"]
    end

    test "#{kind}: create puts the item into a visible project and rejects a hidden one" do
      post "/teams/#{@team.code}/#{kind}", params: { key => { title: "New", project_id: @game.id } }, headers: headers_for(@member), as: :json
      assert_response :created
      assert_equal @game.id, JSON.parse(response.body)[key]["project_id"]

      post "/teams/#{@team.code}/#{kind}", params: { key => { title: "New", project_id: @secret.id } }, headers: headers_for(@member), as: :json
      assert_response :unprocessable_entity
      assert_equal "PROJECT_INVALID", JSON.parse(response.body)["code"]
    end

    test "#{kind}: an item moves between projects and to no project" do
      moved = item(kind, "Movable", project: @game)

      patch "/teams/#{@team.code}/#{kind}/#{moved.id}", params: { key => { project_id: nil } }, headers: headers_for(@member), as: :json
      assert_response :success
      assert_nil moved.reload.project_id

      patch "/teams/#{@team.code}/#{kind}/#{moved.id}", params: { key => { project_id: @secret.id } }, headers: headers_for(@member), as: :json
      assert_response :unprocessable_entity
      assert_nil moved.reload.project_id
    end
  end

  test "folders follow their own project: hidden ones are absent, a selected project lists its folders including empty ones" do
    Folder.create!(team: @team, creator: @owner, item_type: "Page", title: "Open")
    game = Folder.create!(team: @team, creator: @owner, item_type: "Page", title: "Game", project: @game)
    Folder.create!(team: @team, creator: @owner, item_type: "Page", title: "Game empty", project: @game)
    nested = Folder.create!(team: @team, creator: @owner, item_type: "Page", title: "Nested", parent: game, project: @game)
    Folder.create!(team: @team, creator: @owner, item_type: "Page", title: "Secret", project: @secret)
    item(:pages, "Game page", project: @game, folder: nested)

    all = get_json("folders", params: { item_type: "Page" })["folders"].map { |folder| folder["title"] }
    assert_equal [ "Game", "Game empty", "Nested", "Open" ], all.sort

    selected = get_json("folders", params: { item_type: "Page", project_id: @game.id })["folders"].map { |folder| folder["title"] }
    assert_equal [ "Game", "Game empty", "Nested" ], selected.sort
  end

  test "assignees on a project board must be able to see it" do
    outsider = create_member(@team, "Carol")
    board = item(:boards, "Game board", project: @game)
    ticket = Ticket.create!(board: board, team: @team, created_by_user_id: @owner.id, title: "Bug", position: 0)

    post "/teams/#{@team.code}/boards/#{board.id}/tickets/#{ticket.id}/assignees", params: { assignee: { user_id: outsider.id } }, headers: headers_for(@owner), as: :json

    assert_response :unprocessable_entity
    assert_equal "ASSIGNEE_NO_ACCESS", JSON.parse(response.body)["code"]
  end

  test "tickets on hidden boards return BOARD_NOT_FOUND" do
    board = item(:boards, "Secret board", project: @secret)

    get_json("boards/#{board.id}/overview")

    assert_response :not_found
    assert_equal "BOARD_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "favorites of hidden items are kept but hidden, and reappear with access" do
    board = item(:boards, "Board", project: @game)
    Favorite.create!(user: @member, team: @team, favoritable: board, home_position: 0, sidebar_position: 0)

    board.update!(project: @secret)
    assert_equal [], get_json("favorites")["favorites"]

    board.update!(project: @game)
    assert_equal [ "Board" ], get_json("favorites")["favorites"].map { |favorite| favorite["title"] }
  end

  test "favorites filtered by project include only that project's items" do
    open_page = item(:pages, "Open")
    game_page = item(:pages, "Game page", project: @game)
    Favorite.create!(user: @member, team: @team, favoritable: open_page, home_position: 0, sidebar_position: 0)
    Favorite.create!(user: @member, team: @team, favoritable: game_page, home_position: 1, sidebar_position: 1)

    assert_equal [ "Game page" ], get_json("favorites", params: { project_id: @game.id })["favorites"].map { |favorite| favorite["title"] }
  end

  test "favorites report the project of their item, through the board for tickets" do
    board = item(:boards, "Board", project: @game)
    ticket = Ticket.create!(board: board, team: @team, created_by_user_id: @owner.id, title: "Bug", position: 0)
    Favorite.create!(user: @member, team: @team, favoritable: ticket, home_position: 0, sidebar_position: 0)
    Favorite.create!(user: @member, team: @team, favoritable: item(:pages, "Open"), home_position: 1, sidebar_position: 1)

    assert_equal [ @game.id, nil ], get_json("favorites")["favorites"].map { |favorite| favorite["project_id"] }
  end

  test "hidden items cannot be favorited" do
    hidden = item(:pages, "Secret", project: @secret)

    post "/teams/#{@team.code}/favorites", params: { favorite: { favoritable_type: "Page", favoritable_id: hidden.id } }, headers: headers_for(@member), as: :json

    assert_response :not_found
  end

  test "my work leaves out hidden boards and filters by project" do
    open_board = item(:boards, "Open")
    game_board = item(:boards, "Game board", project: @game)
    secret_board = item(:boards, "Secret board", project: @secret)
    [ open_board, game_board, secret_board ].each do |board|
      ticket = Ticket.create!(board: board, team: @team, created_by_user_id: @owner.id, title: board.title, position: 0)
      TicketAssignee.create!(ticket: ticket, user: @member)
    end

    assert_equal [ "Game board", "Open" ], get_json("my_work")["tickets"].map { |ticket| ticket["title"] }.sort
    assert_equal [ "Game board" ], get_json("my_work", params: { project_id: @game.id })["tickets"].map { |ticket| ticket["title"] }
  end
end
