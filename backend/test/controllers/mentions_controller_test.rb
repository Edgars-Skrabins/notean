require "test_helper"

class MentionsControllerTest < ActionDispatch::IntegrationTest
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
    get "/teams/#{@team.code}/mentions/search", params: { q: query, **params }, headers: headers_for(user)
    JSON.parse(response.body)
  end

  def resolve(mentions, user: @user)
    post "/teams/#{@team.code}/mentions/resolve", params: { mentions: mentions }, headers: headers_for(user), as: :json
    JSON.parse(response.body)
  end

  def titles(body)
    body["results"].map { |result| result["title"] }
  end

  def private_project(name = "Secret")
    Project.create!(team: @team, name: name, owner: @owner, creator: @owner)
  end

  def ticket(title, board: @board, column: @column)
    Ticket.create!(board: board, column: column, team: @team, creator: @owner, title: title, position: 0)
  end

  def page(title, project: nil)
    Page.create!(team: @team, creator: @owner, title: title, content: "", project: project)
  end

  test "an empty query lists the first 8 active members by nickname" do
    names = %w[Zed Bob Cat Dan Eve Fay Gus Hal Ivy]
    names.each { |name| create_member(@team, name) }
    create_member(@team, "Ann").memberships.first.remove!
    page("Bob page")

    body = search("")

    assert_response :success
    assert_equal %w[Alice Bob Cat Dan Eve Fay Gus Hal], titles(body)
    assert body["results"].all? { |result| result["type"] == "user" && result["avatar"].present? }
  end

  test "lists people first, then items with prefix matches before contains matches" do
    create_member(@team, "Logan")
    page("Old login notes")
    ticket("Login bug")

    body = search("log")

    assert_equal [ %w[user Logan], %w[ticket Login\ bug], %w[page Old\ login\ notes] ], body["results"].map { |result| [ result["type"], result["title"] ] }
    assert_equal({ "subtitle" => "Sprint", "board_id" => @board.id, "in_backlog" => false }, body["results"][1].slice("subtitle", "board_id", "in_backlog"))
  end

  test "ranks items of the field's board and project first" do
    project = Project.create!(team: @team, name: "Apollo", owner: @owner, creator: @owner)
    ProjectMember.create!(project: project, user: @user)
    other_board = Board.create!(team: @team, creator: @owner, title: "Other")
    ticket("Spec elsewhere", board: other_board, column: nil)
    page("Spec newest")
    page("Spec in project", project: project)
    ticket("Spec here")

    body = search("spec", board_id: @board.id, project_id: project.id)

    assert_equal [ "Spec here", "Spec in project" ], titles(body).first(2)
    assert_equal 4, body["results"].length
  end

  test "returns at most 8 results" do
    10.times { |index| page("Plan #{index}") }

    assert_equal 8, search("plan")["results"].length
  end

  test "leaves out hidden, trashed and disabled items and other teams" do
    hidden = private_project
    page("Rocket hidden", project: hidden)
    Trash.move(page("Rocket trashed"), @owner)
    ticket("Rocket ticket")
    other_team = Team.create!(name: "Other", password: "supersecret")
    Page.create!(team: other_team, creator: @owner, title: "Rocket elsewhere", content: "")
    @team.update!(boards_enabled: false)

    assert_equal [], titles(search("rocket"))
    assert_includes titles(search("rocket", user: @owner)), "Rocket hidden"
  end

  test "search query count does not grow with results" do
    page("Item 0")
    ticket("Item 0")
    one = query_count { search("item") }
    9.times { |index| page("Item #{index + 1}") && ticket("Item #{index + 1}") }

    assert_equal one, query_count { search("item") }
  end

  test "resolves current titles and statuses" do
    found = page("Old title")
    found.update!(title: "New title")
    in_backlog = ticket("Backlog item", column: nil)
    hidden = page("Hidden", project: private_project)
    trashed = page("Trashed")
    Trash.move(trashed, @owner)
    other_page = Page.create!(team: Team.create!(name: "Other", password: "supersecret"), creator: @owner, title: "Other", content: "")
    former = create_member(@team, "Former")
    former.memberships.first.remove!

    body = resolve([
      { type: "page", id: found.id }, { type: "ticket", id: in_backlog.id }, { type: "page", id: hidden.id },
      { type: "page", id: trashed.id }, { type: "page", id: other_page.id }, { type: "user", id: former.id },
      { type: "user", id: @owner.id }, { type: "project", id: 0 }
    ])

    assert_response :success
    assert_equal [
      { "type" => "page", "id" => found.id, "status" => "ok", "title" => "New title" },
      { "type" => "ticket", "id" => in_backlog.id, "status" => "ok", "title" => "Backlog item", "board_id" => @board.id, "in_backlog" => true },
      { "type" => "page", "id" => hidden.id, "status" => "hidden" },
      { "type" => "page", "id" => trashed.id, "status" => "deleted" },
      { "type" => "page", "id" => other_page.id, "status" => "deleted" },
      { "type" => "user", "id" => former.id, "status" => "removed", "nickname" => "Former" }
    ], body["mentions"].first(6)
    assert_equal({ "status" => "ok", "nickname" => "Owner" }, body["mentions"][6].slice("status", "nickname"))
    assert_equal "deleted", body["mentions"][7]["status"]
  end

  test "resolves items of a disabled feature as hidden" do
    found = ticket("Bug")
    @team.update!(boards_enabled: false)

    assert_equal "hidden", resolve([ { type: "ticket", id: found.id } ])["mentions"].first["status"]
  end

  test "rejects too many and invalid mentions" do
    resolve(Array.new(201) { { type: "page", id: 1 } })
    assert_response :unprocessable_entity
    assert_equal "TOO_MANY_MENTIONS", JSON.parse(response.body)["code"]

    assert_equal "INVALID_MENTION", resolve([ { type: "folder", id: 1 } ])["code"]
    assert_equal "INVALID_MENTION", resolve([ { type: "page", id: "x" } ])["code"]
  end

  test "rejects non-members" do
    outsider = User.create!(email: "outsider@example.com", password: "supersecret")

    resolve([], user: outsider)
    assert_response :forbidden
  end

  test "resolve query count does not grow with mentions" do
    refs = ->(count) { Array.new(count) { |index| [ { type: "page", id: page("P#{index}").id }, { type: "ticket", id: ticket("T#{index}").id }, { type: "user", id: create_member(@team, "#{nickname_for(index)}#{count == 1 ? "One" : "Ten"}").id } ] }.flatten }
    one = refs.call(1)
    ten = refs.call(10)

    assert_equal query_count { resolve(one) }, query_count { resolve(ten) }
  end
end
