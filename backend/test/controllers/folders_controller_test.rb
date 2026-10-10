require "test_helper"

class FoldersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    token = JsonWebToken.encode(user_id: @user.id)
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
  end

  test "destroy with mode=cascade destroys the folder and everything nested inside it" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    child = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Child", parent: root)
    page = Page.create!(team: @team, creator: @user, title: "Notes", content: "", folder: root)

    delete "/teams/#{@team.code}/folders/#{root.id}?mode=cascade", headers: @headers

    assert_response :no_content
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
end
