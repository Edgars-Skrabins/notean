require "test_helper"

class ProjectsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @owner, team: @team, role: "owner", nickname: "Alice")
    @admin = create_member(@team, "Adam")
    @admin.memberships.first.update!(role: "admin")
    @member = create_member(@team, "Bob")
    @game = Project.create!(team: @team, name: "Game", owner: @owner, creator: @owner)
    @game.project_members.create!(user: @member)
    @secret = Project.create!(team: @team, name: "Secret", owner: @owner, creator: @owner)
  end

  def headers_for(user)
    { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: user.id)}" }
  end

  def projects_url(project = nil)
    [ "/teams/#{@team.code}/projects", project&.id ].compact.join("/")
  end

  def body
    JSON.parse(response.body)
  end

  test "index lists every project for managers and only own projects for members" do
    get projects_url, headers: headers_for(@admin)
    assert_equal [ "Game", "Secret" ], body["projects"].map { |project| project["name"] }

    get projects_url, headers: headers_for(@member)
    assert_equal [ "Game" ], body["projects"].map { |project| project["name"] }
    assert_equal [ 2, false ], body["projects"].first.values_at("member_count", "can_manage")
  end

  test "an admin creates a project with an owner and members" do
    post projects_url, params: { project: { name: "Website", description: "Marketing", owner_user_id: @member.id, member_ids: [ @admin.id ] } }, headers: headers_for(@admin), as: :json

    assert_response :created
    project = body["project"]
    assert_equal [ "Website", "Marketing", "Bob" ], [ project["name"], project["description"], project["owner"]["nickname"] ]
    assert_equal [ "Adam", "Bob" ], project["members"].map { |member| member["nickname"] }.sort
  end

  test "the owner defaults to the creator" do
    post projects_url, params: { project: { name: "Website" } }, headers: headers_for(@admin), as: :json

    assert_equal "Adam", body["project"]["owner"]["nickname"]
  end

  test "a regular member cannot create projects" do
    post projects_url, params: { project: { name: "Website" } }, headers: headers_for(@member), as: :json

    assert_response :forbidden
    assert_equal "FORBIDDEN", body["code"]
  end

  test "names are unique per team regardless of case" do
    post projects_url, params: { project: { name: "game" } }, headers: headers_for(@owner), as: :json

    assert_response :unprocessable_entity
    assert_equal "PROJECT_NAME_TAKEN", body["code"]
  end

  test "members from outside the team are rejected" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    post projects_url, params: { project: { name: "Website", member_ids: [ outsider.id ] } }, headers: headers_for(@owner), as: :json

    assert_response :unprocessable_entity
    assert_equal "PROJECT_INVALID_MEMBERS", body["code"]
  end

  test "a hidden project returns PROJECT_NOT_FOUND" do
    get projects_url(@secret), headers: headers_for(@member)

    assert_response :not_found
    assert_equal "PROJECT_NOT_FOUND", body["code"]
  end

  test "the project owner and the team owner can update; an admin who does not own it cannot" do
    owned_by_member = Project.create!(team: @team, name: "Bob's", owner: @member, creator: @owner)

    patch projects_url(owned_by_member), params: { project: { name: "Renamed", owner_user_id: @member.id } }, headers: headers_for(@member), as: :json
    assert_response :success

    patch projects_url(owned_by_member), params: { project: { name: "Again", owner_user_id: @member.id } }, headers: headers_for(@owner), as: :json
    assert_response :success

    patch projects_url(owned_by_member), params: { project: { name: "Nope", owner_user_id: @member.id } }, headers: headers_for(@admin), as: :json
    assert_response :forbidden
  end

  test "ownership can be handed over" do
    patch projects_url(@game), params: { project: { name: "Game", owner_user_id: @member.id, member_ids: [] } }, headers: headers_for(@owner), as: :json

    assert_response :success
    assert_equal "Bob", body["project"]["owner"]["nickname"]
    assert_equal [ "Bob" ], body["project"]["members"].map { |member| member["nickname"] }
  end

  test "removing a member drops their assignments on the project's boards" do
    board = Board.create!(team: @team, creator: @owner, title: "Game board", project: @game)
    ticket = Ticket.create!(board: board, team: @team, created_by_user_id: @owner.id, title: "Bug", position: 0)
    TicketAssignee.create!(ticket: ticket, user: @member)

    patch projects_url(@game), params: { project: { name: "Game", owner_user_id: @owner.id, member_ids: [] } }, headers: headers_for(@owner), as: :json

    assert_response :success
    assert_equal [], ticket.reload.assignees.to_a
  end

  test "delete requires the exact project name" do
    delete projects_url(@game), params: { project: { mode: "keep", confirm_name: "game" } }, headers: headers_for(@owner), as: :json

    assert_response :unprocessable_entity
    assert_equal "PROJECT_NAME_MISMATCH", body["code"]
    assert Project.exists?(@game.id)
  end

  test "delete rejects an unknown mode" do
    delete projects_url(@game), params: { project: { mode: "everything", confirm_name: "Game" } }, headers: headers_for(@owner), as: :json

    assert_equal "PROJECT_DELETE_MODE_INVALID", body["code"]
  end

  test "delete with keep leaves the items without a project" do
    page = Page.create!(team: @team, creator: @owner, title: "Notes", content: "", project: @game)

    delete projects_url(@game), params: { project: { mode: "keep", confirm_name: "Game" } }, headers: headers_for(@owner), as: :json

    assert_response :no_content
    assert_nil page.reload.project_id
  end

  test "delete with keep makes the project's folders team-wide and keeps the tree" do
    root = Folder.create!(team: @team, creator: @owner, item_type: "Page", title: "Root", project: @game)
    child = Folder.create!(team: @team, creator: @owner, item_type: "Page", title: "Child", parent: root, project: @game)
    page = Page.create!(team: @team, creator: @owner, title: "Notes", content: "", folder: child, project: @game)

    delete projects_url(@game), params: { project: { mode: "keep", confirm_name: "Game" } }, headers: headers_for(@owner), as: :json

    assert_response :no_content
    assert_equal [ nil, nil ], [ root.reload.project_id, child.reload.project_id ]
    assert_equal [ root.id, child.id, nil ], [ child.parent_id, page.reload.folder_id, page.project_id ]
  end

  test "delete with delete_items also removes the project's folders" do
    root = Folder.create!(team: @team, creator: @owner, item_type: "Page", title: "Root", project: @game)
    child = Folder.create!(team: @team, creator: @owner, item_type: "Page", title: "Child", parent: root, project: @game)
    Page.create!(team: @team, creator: @owner, title: "Notes", content: "", folder: child, project: @game)
    open_folder = Folder.create!(team: @team, creator: @owner, item_type: "Page", title: "Open")

    delete projects_url(@game), params: { project: { mode: "delete_items", confirm_name: "Game" } }, headers: headers_for(@owner), as: :json

    assert_response :no_content
    assert_equal [ open_folder.id ], Folder.pluck(:id)
  end

  test "delete with delete_items removes items, tickets and favorites" do
    page = Page.create!(team: @team, creator: @owner, title: "Notes", content: "", project: @game)
    board = Board.create!(team: @team, creator: @owner, title: "Game board", project: @game)
    ticket = Ticket.create!(board: board, team: @team, created_by_user_id: @owner.id, title: "Bug", position: 0)
    Favorite.create!(user: @owner, team: @team, favoritable: ticket, home_position: 0, sidebar_position: 0)

    delete projects_url(@game), params: { project: { mode: "delete_items", confirm_name: "Game" } }, headers: headers_for(@owner), as: :json

    assert_response :no_content
    assert_not Page.exists?(page.id)
    assert_not Ticket.exists?(ticket.id)
    assert_equal 0, Favorite.count
  end

  test "index runs the same number of queries for 1 and 10 projects" do
    attach_avatar(@admin)
    Project.destroy_all
    Project.create!(team: @team, name: "First", owner: @admin, creator: @owner)
    one = query_count { get projects_url, headers: headers_for(@owner) }

    9.times { |index| Project.create!(team: @team, name: "Project #{index}", owner: [ @owner, @admin, @member ][index % 3], creator: @owner) }
    ten = query_count { get projects_url, headers: headers_for(@owner) }

    assert_equal 10, body["projects"].length
    assert_equal one, ten
  end
end
