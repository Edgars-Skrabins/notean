require "test_helper"

class DiagramsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    @diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: "")
    token = session_token(@user)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  test "index runs the same number of queries for 1 and 10 diagrams" do
    attach_avatar(@user)
    members = 3.times.map { |index| create_member(@team, nickname_for(index), with_avatar: index.zero?) }
    one = query_count { get "/teams/#{@team.code}/diagrams", headers: @headers }

    9.times { |index| Diagram.create!(team: @team, creator: members[index % 3], title: "Diagram #{index}", content: "") }
    ten = query_count { get "/teams/#{@team.code}/diagrams", headers: @headers }

    assert_equal 10, JSON.parse(response.body)["diagrams"].length
    assert_equal one, ten
  end

  test "show and update run the same number of queries for 1 and 10 contributors" do
    attach_avatar(@user)
    @diagram.diagram_contributors.create!(user: @user)
    show_one = query_count { get "/teams/#{@team.code}/diagrams/#{@diagram.id}", headers: @headers }
    update_one = query_count { patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { title: "Flow", lock_version: @diagram.reload.lock_version } }, headers: @headers, as: :json }

    9.times { |index| @diagram.diagram_contributors.create!(user: create_member(@team, nickname_for(index), with_avatar: index.zero?)) }
    show_ten = query_count { get "/teams/#{@team.code}/diagrams/#{@diagram.id}", headers: @headers }
    update_ten = query_count { patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { title: "Flow", lock_version: @diagram.reload.lock_version } }, headers: @headers, as: :json }

    assert_equal 10, JSON.parse(response.body)["diagram"]["contributors"].length
    assert_equal show_one, show_ten
    assert_equal update_one, update_ten
  end

  test "returns FEATURE_DISABLED when diagrams are turned off" do
    @team.update!(diagrams_enabled: false)

    get "/teams/#{@team.code}/diagrams", headers: @headers
    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, JSON.parse(response.body))

    get "/teams/#{@team.code}/diagrams/#{@diagram.id}", headers: @headers
    assert_response :forbidden
  end

  test "diagrams stay available when only another feature is turned off" do
    @team.update!(pages_enabled: false, boards_enabled: false)

    get "/teams/#{@team.code}/diagrams/#{@diagram.id}", headers: @headers

    assert_response :success
  end

  test "create stores the content and folder" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Flows")
    content = { cells: [ { shape: "process", attrs: { text: { text: "Start" } } } ] }.to_json

    post "/teams/#{@team.code}/diagrams", params: { diagram: { title: "Flow", content: content, folder_id: folder.id } }, headers: @headers, as: :json

    assert_response :created
    diagram = Diagram.find(JSON.parse(response.body)["diagram"]["id"])
    assert_equal content, diagram.content
    assert_equal folder.id, diagram.folder_id
    assert_includes diagram.search_text, "Start"
    assert_empty diagram.contributors
  end

  test "create rejects a folder of another type" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Specs")

    assert_no_difference "Diagram.count" do
      post "/teams/#{@team.code}/diagrams", params: { diagram: { title: "Flow", folder_id: folder.id } }, headers: @headers, as: :json
    end

    assert_response :unprocessable_entity
    assert_equal({ "code" => "DIAGRAM_CREATE_FAILED" }, JSON.parse(response.body))
  end

  test "create rejects a folder from another team" do
    other_team = Team.create!(name: "Design", password: "supersecret")
    folder = Folder.create!(team: other_team, creator: @user, item_type: "Diagram", title: "Elsewhere")

    assert_no_difference "Diagram.count" do
      post "/teams/#{@team.code}/diagrams", params: { diagram: { title: "Flow", folder_id: folder.id } }, headers: @headers, as: :json
    end

    assert_response :not_found
    assert_equal({ "code" => "FOLDER_NOT_FOUND" }, JSON.parse(response.body))
  end

  test "create in a folder takes the folder's project and ignores a sent project_id" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    other = Project.create!(team: @team, name: "Zeus", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Root", project: project)

    post "/teams/#{@team.code}/diagrams", params: { diagram: { title: "New", folder_id: folder.id, project_id: other.id } }, headers: @headers, as: :json

    assert_response :created
    assert_equal [ folder.id, project.id ], JSON.parse(response.body)["diagram"].values_at("folder_id", "project_id")
  end

  test "create in a folder the user can't see is not found" do
    member = create_member(@team, "Bob")
    secret = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Plans", project: secret)
    member_headers = { "Authorization" => "Bearer #{session_token(member)}" }

    post "/teams/#{@team.code}/diagrams", params: { diagram: { title: "New", folder_id: folder.id } }, headers: member_headers, as: :json

    assert_response :not_found
    assert_equal "FOLDER_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "moving into a folder adopts the folder's project" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Root", project: project)

    patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { folder_id: folder.id } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ folder.id, project.id ], [ @diagram.reload.folder_id, @diagram.project_id ]
  end

  test "changing the project while staying in a folder is rejected with PROJECT_SET_BY_FOLDER" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Root")
    @diagram.update!(folder: folder)

    patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { project_id: project.id } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "PROJECT_SET_BY_FOLDER", JSON.parse(response.body)["code"]
    assert_nil @diagram.reload.project_id
  end

  test "moving out of a folder can set the project in the same request" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Root")
    @diagram.update!(folder: folder)

    patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { folder_id: nil, project_id: project.id } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ nil, project.id ], [ @diagram.reload.folder_id, @diagram.project_id ]
  end

  test "update with the current version saves and increments it" do
    patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { content: "{}", lock_version: 0 } }, headers: @headers, as: :json

    assert_response :success
    assert_equal 1, JSON.parse(response.body)["diagram"]["lock_version"]
    assert_equal [ "{}", 1 ], [ @diagram.reload.content, @diagram.lock_version ]
  end

  test "update with a stale version returns EDIT_CONFLICT with the latest diagram" do
    @diagram.update!(title: "Theirs")

    patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { title: "Mine", lock_version: 0 } }, headers: @headers, as: :json

    assert_response :conflict
    body = JSON.parse(response.body)
    assert_equal "EDIT_CONFLICT", body["code"]
    assert_equal [ "Theirs", 1 ], [ body["diagram"]["title"], body["diagram"]["lock_version"] ]
    assert_equal "Theirs", @diagram.reload.title
  end

  test "update of the title without a version returns LOCK_VERSION_REQUIRED" do
    patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { title: "Mine" } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "LOCK_VERSION_REQUIRED", JSON.parse(response.body)["code"]
    assert_equal "Flow", @diagram.reload.title
  end

  test "moving into a folder needs no version" do
    @diagram.update!(title: "Renamed")
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Root")

    patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { folder_id: folder.id } }, headers: @headers, as: :json

    assert_response :success
    assert_equal folder.id, @diagram.reload.folder_id
  end

  test "create returns TITLE_TOO_LONG for an over-limit title" do
    post "/teams/#{@team.code}/diagrams", params: { diagram: { title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1) } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal({ "code" => "TITLE_TOO_LONG" }, JSON.parse(response.body))
  end

  test "update returns CONTENT_TOO_LARGE for over-limit content" do
    patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { content: "a" * (ContentLimits::CONTENT_MAX_BYTES + 1), lock_version: 0 } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal({ "code" => "CONTENT_TOO_LARGE" }, JSON.parse(response.body))
  end

  def list_diagrams(params = {})
    get "/teams/#{@team.code}/diagrams", params: params, headers: @headers
    JSON.parse(response.body)
  end

  def listed_titles(params = {})
    list_diagrams(params)["diagrams"].map { |diagram| diagram["title"] }
  end

  test "index lists root diagrams without the foldered ones, sorted by title" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Specs")
    Diagram.create!(team: @team, creator: @user, title: "alpha", content: "")
    Diagram.create!(team: @team, creator: @user, title: "Inside", content: "", folder: folder)

    assert_equal [ "alpha", "Flow" ], listed_titles(folder_id: "root")
  end

  test "index lists only the diagrams of the requested folder" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Specs")
    other = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Other")
    Diagram.create!(team: @team, creator: @user, title: "Inside", content: "", folder: folder)
    Diagram.create!(team: @team, creator: @user, title: "Elsewhere", content: "", folder: other)

    assert_equal [ "Inside" ], listed_titles(folder_id: folder.id)
  end

  test "index returns FOLDER_NOT_FOUND for a folder the user can't see" do
    secret = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    bob = create_member(@team, "Bob")
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Hidden", project: secret)

    get "/teams/#{@team.code}/diagrams", params: { folder_id: folder.id }, headers: { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: bob.id)}" }

    assert_response :not_found
    assert_equal({ "code" => "FOLDER_NOT_FOUND" }, JSON.parse(response.body))
  end

  test "index search crosses folders and ignores folder_id" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Specs")
    Diagram.create!(team: @team, creator: @user, title: "Roadmap draft", content: "", folder: folder)
    Diagram.create!(team: @team, creator: @user, title: "roadmap", content: "")

    assert_equal [ "roadmap", "Roadmap draft" ], listed_titles(search: "ROAD", folder_id: "root")
  end

  test "index pages by 50 and flips has_more at the end" do
    @diagram.destroy
    55.times { |index| Diagram.create!(team: @team, creator: @user, title: format("Item %02d", index), content: "") }

    first = list_diagrams(folder_id: "root")
    assert_equal 50, first["diagrams"].length
    assert first["has_more"]

    rest = list_diagrams(folder_id: "root", offset: 50)
    assert_equal (50..54).map { |index| format("Item %02d", index) }, rest["diagrams"].map { |diagram| diagram["title"] }
    assert_not rest["has_more"]
  end

  test "index applies the project filter and hides other people's projects" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    Diagram.create!(team: @team, creator: @user, title: "In project", content: "", project: project)
    bob = create_member(@team, "Bob")

    assert_equal [ "In project" ], listed_titles(project_id: project.id, folder_id: "root")

    get "/teams/#{@team.code}/diagrams", params: { folder_id: "root" }, headers: { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: bob.id)}" }
    assert_equal [ "Flow" ], JSON.parse(response.body)["diagrams"].map { |diagram| diagram["title"] }
  end
end
