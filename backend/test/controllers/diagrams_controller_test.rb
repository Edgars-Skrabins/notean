require "test_helper"

class DiagramsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    @diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: "")
    token = JsonWebToken.encode(user_id: @user.id)
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
    update_one = query_count { patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { title: "Flow" } }, headers: @headers, as: :json }

    9.times { |index| @diagram.diagram_contributors.create!(user: create_member(@team, nickname_for(index), with_avatar: index.zero?)) }
    show_ten = query_count { get "/teams/#{@team.code}/diagrams/#{@diagram.id}", headers: @headers }
    update_ten = query_count { patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { title: "Flow" } }, headers: @headers, as: :json }

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
    member_headers = { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: member.id)}" }

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

  test "create returns TITLE_TOO_LONG for an over-limit title" do
    post "/teams/#{@team.code}/diagrams", params: { diagram: { title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1) } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal({ "code" => "TITLE_TOO_LONG" }, JSON.parse(response.body))
  end

  test "update returns CONTENT_TOO_LARGE for over-limit content" do
    patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { content: "a" * (ContentLimits::CONTENT_MAX_BYTES + 1) } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal({ "code" => "CONTENT_TOO_LARGE" }, JSON.parse(response.body))
  end
end
