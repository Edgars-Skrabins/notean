require "test_helper"

class SearchControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "owner@example.com", password: "supersecret")
    Membership.create!(user: @owner, team: @team, role: "owner", nickname: "Owner")
    @user = create_member(@team, "Alice")
    @board = Board.create!(team: @team, creator: @owner, title: "Sprint")
    @column = Column.create!(board: @board, title: "To Do", position: 0)
  end

  def headers_for(user)
    { "Authorization" => "Bearer #{session_token(user)}" }
  end

  def search(query, user: @user, **params)
    get "/teams/#{@team.code}/search", params: { q: query, **params }, headers: headers_for(user)
    JSON.parse(response.body)
  end

  def section(body, type)
    body["sections"].find { |item| item["type"] == type }
  end

  def titles(body, type)
    section(body, type)["results"].map { |result| result["title"] }
  end

  def project(name, members: [], description: "")
    created = Project.create!(team: @team, name: name, description: description, owner: @owner, creator: @owner)
    members.each { |member| ProjectMember.create!(project: created, user: member) }
    created
  end

  def page(title, content: "", project: nil)
    Page.create!(team: @team, creator: @owner, title: title, content: content, project: project)
  end

  def diagram(title, label: nil, project: nil)
    content = label ? { cells: [ { attrs: { text: { text: label } } } ] }.to_json : ""
    Diagram.create!(team: @team, creator: @owner, title: title, content: content, project: project)
  end

  def ticket(title, description: nil, board: @board, column: @column)
    Ticket.create!(board: board, column: column, team: @team, creator: @owner, title: title, description: description, position: 0)
  end

  test "returns all five sections in order" do
    body = search("nothing")

    assert_response :success
    assert_equal %w[project page diagram board ticket], body["sections"].map { |item| item["type"] }
    assert body["sections"].all? { |item| item["results"].empty? && item["has_more"] == false }
  end

  test "finds each type by title without a snippet" do
    shared = project("Rocket project", members: [ @user ])
    page("Rocket page", project: shared)
    diagram("Rocket diagram")
    Board.create!(team: @team, creator: @owner, title: "Rocket board", project: shared)
    ticket("Rocket ticket")

    body = search("rocket")

    %w[project page diagram board ticket].each do |type|
      result = section(body, type)["results"].sole
      assert_equal "Rocket #{type}", result["title"]
      assert_nil result["snippet"]
    end
    assert_nil section(body, "project")["results"].first["project_name"]
    assert_equal "Rocket project", section(body, "page")["results"].first["project_name"]
    assert_equal "Rocket project", section(body, "board")["results"].first["project_name"]
    assert_nil section(body, "diagram")["results"].first["project_name"]
  end

  test "finds each type by content with a snippet" do
    project("Garden", members: [ @user ], description: "Plant the rocket seeds")
    page("Plans", content: "<p>Build a <strong>rocket</strong></p>")
    diagram("Flow", label: "Launch rocket")
    ticket("Crash", description: "The rocket crashes")

    body = search("ROCKET")

    assert_equal "Plant the rocket seeds", section(body, "project")["results"].sole["snippet"]
    assert_equal "Build a rocket", section(body, "page")["results"].sole["snippet"]
    assert_equal "Launch rocket", section(body, "diagram")["results"].sole["snippet"]
    assert_equal "The rocket crashes", section(body, "ticket")["results"].sole["snippet"]
  end

  test "cuts long snippets around the match" do
    words = Array.new(40) { |index| "word#{index}" }
    words[20] = "rocket"
    page("Long", content: "<p>#{words.join(" ")}</p>")

    snippet = section(search("rocket"), "page")["results"].sole["snippet"]

    assert snippet.start_with?("…")
    assert snippet.end_with?("…")
    assert_includes snippet, "rocket"
    assert_operator snippet.length, :<=, SearchController::SNIPPET_LENGTH + 2
  end

  test "ticket results carry their board and backlog state" do
    ticket("Ticket on board")
    ticket("Ticket in backlog", column: nil)

    results = section(search("ticket"), "ticket")["results"].index_by { |result| result["title"] }

    assert_equal [ @board.id, "Sprint", false ], results["Ticket on board"].values_at("board_id", "board_title", "in_backlog")
    assert_equal true, results["Ticket in backlog"]["in_backlog"]
  end

  test "title matches come first, then the most recently updated" do
    content_match = page("Notes", content: "<p>rocket</p>")
    older_title = page("Rocket old")
    newer_title = page("Rocket new")
    older_title.update_column(:updated_at, 2.days.ago)
    newer_title.update_column(:updated_at, 1.day.ago)
    content_match.update_column(:updated_at, Time.current)

    assert_equal [ "Rocket new", "Rocket old", "Notes" ], titles(search("rocket"), "page")
  end

  test "hides items in projects the user is not a member of" do
    hidden = project("Hidden rocket")
    page("Rocket page", project: hidden)
    diagram("Rocket diagram", project: hidden)
    hidden_board = Board.create!(team: @team, creator: @owner, title: "Rocket board", project: hidden)
    ticket("Rocket ticket", board: hidden_board, column: nil)

    body = search("rocket")

    assert body["sections"].all? { |item| item["results"].empty? }
  end

  test "admins see items in every project" do
    admin = create_member(@team, "Admin")
    @team.memberships.find_by(user: admin).update!(role: "admin")
    hidden = project("Hidden rocket")
    page("Rocket page", project: hidden)
    hidden_board = Board.create!(team: @team, creator: @owner, title: "Rocket board", project: hidden)
    ticket("Rocket ticket", board: hidden_board, column: nil)

    body = search("rocket", user: admin)

    assert_equal [ "Hidden rocket" ], titles(body, "project")
    assert_equal [ "Rocket page" ], titles(body, "page")
    assert_equal [ "Rocket board" ], titles(body, "board")
    assert_equal [ "Rocket ticket" ], titles(body, "ticket")
  end

  test "project_id limits results to that project" do
    selected = project("Selected rocket", members: [ @user ])
    project("Other rocket", members: [ @user ])
    page("Rocket inside", project: selected)
    page("Rocket outside")
    selected_board = Board.create!(team: @team, creator: @owner, title: "Board", project: selected)
    ticket("Rocket in project", board: selected_board, column: nil)
    ticket("Rocket elsewhere")

    body = search("rocket", project_id: selected.id)

    assert_equal [ "Selected rocket" ], titles(body, "project")
    assert_equal [ "Rocket inside" ], titles(body, "page")
    assert_equal [ "Rocket in project" ], titles(body, "ticket")
  end

  test "a hidden project_id gives 404" do
    hidden = project("Hidden")

    body = search("rocket", project_id: hidden.id)

    assert_response :not_found
    assert_equal "PROJECT_NOT_FOUND", body["code"]
  end

  test "a one-character query searches" do
    page("Xylophone")

    body = search(" x ")

    assert_response :success
    assert_equal [ "Xylophone" ], titles(body, "page")
  end

  test "an empty or whitespace-only query gives 422" do
    [ "", "   " ].each do |query|
      body = search(query)

      assert_response :unprocessable_entity
      assert_equal "QUERY_TOO_SHORT", body["code"]
    end
  end

  test "an unknown type gives 422" do
    body = search("rocket", type: "folder")

    assert_response :unprocessable_entity
    assert_equal "INVALID_TYPE", body["code"]
  end

  test "sections hold five results and flag has_more" do
    6.times { |index| page("Rocket #{index}") }

    page_section = section(search("rocket"), "page")

    assert_equal 5, page_section["results"].length
    assert_equal true, page_section["has_more"]
  end

  test "type and offset page through one section in tens" do
    16.times { |index| travel_to(index.minutes.ago) { page("Rocket #{index}") } }

    first = search("rocket", type: "page", offset: 5)["section"]
    second = search("rocket", type: "page", offset: 15)["section"]

    assert_equal "page", first["type"]
    assert_equal (5..14).map { |index| "Rocket #{index}" }, first["results"].map { |result| result["title"] }
    assert_equal true, first["has_more"]
    assert_equal [ "Rocket 15" ], second["results"].map { |result| result["title"] }
    assert_equal false, second["has_more"]
  end

  test "a non-member gets 403" do
    outsider = User.create!(email: "outsider@example.com", password: "supersecret")

    body = search("rocket", user: outsider)

    assert_response :forbidden
    assert_equal "NOT_TEAM_MEMBER", body["code"]
  end

  test "query count does not grow with the number of results" do
    shared = project("Shared", members: [ @user ])
    seed = lambda do |range|
      range.each do |index|
        project("Rocket #{index}", members: [ @user ])
        page("Rocket #{index}", project: shared)
        diagram("Rocket #{index}", project: shared)
        board = Board.create!(team: @team, creator: @owner, title: "Rocket #{index}", project: shared)
        ticket("Rocket #{index}", board: board, column: nil)
      end
    end

    seed.call(0...1)
    one = query_count { search("rocket") }
    seed.call(1...10)
    ten = query_count { search("rocket") }

    assert_equal one, ten
  end

  test "leaves out the sections of disabled features, tickets following boards" do
    page("Rocket page")
    ticket("Rocket ticket")
    @team.update!(boards_enabled: false)

    body = search("rocket")

    assert_response :success
    assert_equal %w[project page diagram], body["sections"].map { |item| item["type"] }
    assert_equal [ "Rocket page" ], titles(body, "page")
  end

  test "returns FEATURE_DISABLED when paging through a disabled type" do
    @team.update!(diagrams_enabled: false)

    body = search("rocket", type: "diagram", offset: 5)

    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, body)
  end
end
