require "test_helper"

class FoldersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    token = session_token(@user)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  test "destroy with mode=promote reparents children and pages one level up" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    child = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Child", parent: root)
    grandchild = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Grandchild", parent: child)
    page = Page.create!(team: @team, creator: @user, title: "Notes", content: "", folder: child)

    delete "/teams/#{@team.code}/folders/#{child.id}?mode=promote", headers: @headers

    assert_response :no_content
    assert_nil Folder.find_by(id: child.id)
    assert_equal root.id, page.reload.folder_id
    assert_equal root.id, grandchild.reload.parent_id
    assert_not Folder.unscoped.exists?(child.id)
    assert_equal 0, TrashEntry.count
  end

  test "destroy with mode=cascade moves the folder and everything nested inside it to the trash" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    child = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Child", parent: root)
    page = Page.create!(team: @team, creator: @user, title: "Notes", content: "", folder: root)

    delete "/teams/#{@team.code}/folders/#{root.id}?mode=cascade", headers: @headers

    assert_response :success
    entry = TrashEntry.find_by!(item_type: "Folder", item_id: root.id)
    assert_equal({ "trash_entry_ids" => [ entry.id ] }, JSON.parse(response.body))
    assert_equal [ entry.id ] * 3, [ Folder.unscoped.find(root.id), Folder.unscoped.find(child.id), Page.unscoped.find(page.id) ].map(&:trash_entry_id)
    assert_nil Folder.find_by(id: root.id)
    assert_nil Folder.find_by(id: child.id)
    assert_nil Page.find_by(id: page.id)
  end

  test "destroy without a mode is rejected" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")

    delete "/teams/#{@team.code}/folders/#{root.id}", headers: @headers

    assert_response :unprocessable_entity
    assert Folder.exists?(root.id)
  end

  test "update rejects moving a folder under a folder of a different item_type" do
    page_folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Pages root")
    diagram_folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Diagrams root")

    patch "/teams/#{@team.code}/folders/#{diagram_folder.id}",
      params: { folder: { parent_id: page_folder.id } },
      headers: @headers,
      as: :json

    assert_response :unprocessable_entity
    assert_equal "FOLDER_PARENT_TYPE_MISMATCH", JSON.parse(response.body)["code"]
    assert_nil diagram_folder.reload.parent_id
  end

  test "update rejects moving a folder onto its own descendant" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    child = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Child", parent: root)

    patch "/teams/#{@team.code}/folders/#{root.id}",
      params: { folder: { parent_id: child.id } },
      headers: @headers,
      as: :json

    assert_response :unprocessable_entity
    assert_equal "FOLDER_PARENT_CIRCULAR", JSON.parse(response.body)["code"]
    assert_nil root.reload.parent_id
  end

  test "index runs the same number of queries for 1 and 10 folders" do
    attach_avatar(@user)
    members = 3.times.map { |index| create_member(@team, nickname_for(index), with_avatar: index.zero?) }
    Folder.create!(team: @team, creator: @user, item_type: "Page", title: "First")
    one = query_count { get "/teams/#{@team.code}/folders", params: { item_type: "Page" }, headers: @headers }

    9.times { |index| Folder.create!(team: @team, creator: members[index % 3], item_type: "Page", title: "Folder #{index}") }
    ten = query_count { get "/teams/#{@team.code}/folders", params: { item_type: "Page" }, headers: @headers }

    assert_equal 10, JSON.parse(response.body)["folders"].length
    assert_equal one, ten
  end

  test "returns FEATURE_DISABLED for folders of a disabled item type" do
    page_folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Notes")
    @team.update!(pages_enabled: false)

    get "/teams/#{@team.code}/folders?item_type=Page", headers: @headers
    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, JSON.parse(response.body))

    post "/teams/#{@team.code}/folders", params: { folder: { title: "New", item_type: "Page" } }, headers: @headers, as: :json
    assert_response :forbidden

    patch "/teams/#{@team.code}/folders/#{page_folder.id}", params: { folder: { title: "Renamed" } }, headers: @headers, as: :json
    assert_response :forbidden
    assert_equal "Notes", page_folder.reload.title

    delete "/teams/#{@team.code}/folders/#{page_folder.id}?mode=cascade", headers: @headers
    assert_response :forbidden
    assert Folder.exists?(page_folder.id)
  end

  test "keeps folders of an enabled item type working when another type is disabled" do
    diagram_folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Flows")
    @team.update!(pages_enabled: false)

    get "/teams/#{@team.code}/folders?item_type=Diagram", headers: @headers
    assert_response :success

    patch "/teams/#{@team.code}/folders/#{diagram_folder.id}", params: { folder: { title: "Renamed" } }, headers: @headers, as: :json
    assert_response :success

    post "/teams/#{@team.code}/folders", params: { folder: { title: "New", item_type: "Diagram" } }, headers: @headers, as: :json
    assert_response :created
  end

  test "folders of a project the user can't see are not found on update and delete" do
    member = create_member(@team, "Bob")
    secret = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Plans", project: secret)
    page = Page.create!(team: @team, creator: @user, title: "Budget", content: "", folder: folder, project: secret)

    patch "/teams/#{@team.code}/folders/#{folder.id}", params: { folder: { title: "Mine" } }, headers: headers_for(member), as: :json
    assert_response :not_found

    delete "/teams/#{@team.code}/folders/#{folder.id}?mode=cascade", headers: headers_for(member)
    assert_response :not_found
    assert Folder.exists?(folder.id)
    assert Page.exists?(page.id)
  end

  test "a subfolder can't be created inside a folder the user can't see" do
    member = create_member(@team, "Bob")
    secret = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Plans", project: secret)

    post "/teams/#{@team.code}/folders", params: { folder: { title: "Sneaky", item_type: "Page", parent_id: folder.id } }, headers: headers_for(member), as: :json

    assert_response :not_found
    assert_equal "FOLDER_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "create sets a top-level folder's project and gives subfolders their parent's project" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)

    post "/teams/#{@team.code}/folders", params: { folder: { title: "Root", item_type: "Page", project_id: project.id } }, headers: @headers, as: :json
    assert_response :created
    root = JSON.parse(response.body)["folder"]
    assert_equal project.id, root["project_id"]

    post "/teams/#{@team.code}/folders", params: { folder: { title: "Child", item_type: "Page", parent_id: root["id"] } }, headers: @headers, as: :json
    assert_response :created
    assert_equal project.id, JSON.parse(response.body)["folder"]["project_id"]
  end

  test "sending project_id for a subfolder is rejected with PROJECT_SET_BY_FOLDER" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    child = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Child", parent: root)

    post "/teams/#{@team.code}/folders", params: { folder: { title: "New", item_type: "Page", parent_id: root.id, project_id: project.id } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "PROJECT_SET_BY_FOLDER", JSON.parse(response.body)["code"]

    patch "/teams/#{@team.code}/folders/#{child.id}", params: { folder: { project_id: project.id } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "PROJECT_SET_BY_FOLDER", JSON.parse(response.body)["code"]
    assert_nil child.reload.project_id
  end

  test "changing a top-level folder's project moves its whole subtree" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    child = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Child", parent: root)
    page = Page.create!(team: @team, creator: @user, title: "Notes", content: "", folder: child)

    patch "/teams/#{@team.code}/folders/#{root.id}", params: { folder: { project_id: project.id } }, headers: @headers, as: :json

    assert_response :success
    assert_equal project.id, JSON.parse(response.body)["folder"]["project_id"]
    assert_equal project.id, child.reload.project_id
    assert_equal project.id, page.reload.project_id
  end

  test "changing a folder's project to one the user can't see is rejected" do
    member = create_member(@team, "Bob")
    secret = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Open")

    patch "/teams/#{@team.code}/folders/#{folder.id}", params: { folder: { project_id: secret.id } }, headers: headers_for(member), as: :json

    assert_response :unprocessable_entity
    assert_equal "PROJECT_INVALID", JSON.parse(response.body)["code"]
    assert_nil folder.reload.project_id
  end

  test "moving a folder under a folder of another project gives the moved subtree that project" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    target = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Target", project: project)
    moved = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Moved")
    inner = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Inner", parent: moved)
    page = Page.create!(team: @team, creator: @user, title: "Notes", content: "", folder: inner)

    patch "/teams/#{@team.code}/folders/#{moved.id}", params: { folder: { parent_id: target.id } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ target.id, project.id ], [ moved.reload.parent_id, moved.project_id ]
    assert_equal project.id, inner.reload.project_id
    assert_equal project.id, page.reload.project_id
  end

  test "moving a folder to the top level keeps its project" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root", project: project)
    child = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Child", parent: root, project: project)

    patch "/teams/#{@team.code}/folders/#{child.id}", params: { folder: { parent_id: nil } }, headers: @headers, as: :json

    assert_response :success
    assert_nil child.reload.parent_id
    assert_equal project.id, child.project_id
  end


  test "update returns TITLE_TOO_LONG for an over-limit title" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Runbooks")

    patch "/teams/#{@team.code}/folders/#{folder.id}", params: { folder: { title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1) } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal({ "code" => "TITLE_TOO_LONG" }, JSON.parse(response.body))
  end

  def headers_for(user)
    { "Authorization" => "Bearer #{session_token(user)}" }
  end
end
