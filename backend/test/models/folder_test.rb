require "test_helper"

class FolderTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
  end

  test "is invalid without a title" do
    folder = Folder.new(team: @team, creator: @user, item_type: "Page", title: nil)

    assert_not folder.valid?
    assert_includes folder.errors[:title], "can't be blank"
  end

  test "is invalid with an item_type other than Page or Diagram" do
    folder = Folder.new(team: @team, creator: @user, item_type: "Board", title: "Engineering")

    assert_not folder.valid?
    assert_includes folder.errors[:item_type], "is not included in the list"
  end

  test "is valid with a Page or Diagram item_type and a title" do
    assert Folder.new(team: @team, creator: @user, item_type: "Page", title: "Runbooks").valid?
    assert Folder.new(team: @team, creator: @user, item_type: "Diagram", title: "Runbooks").valid?
  end

  test "is invalid when its parent belongs to a different item_type" do
    parent = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    child = Folder.new(team: @team, creator: @user, item_type: "Diagram", title: "Child", parent: parent)

    assert_not child.valid?
    assert_includes child.errors[:parent_id], "must be a folder of the same type"
  end

  test "is invalid when its parent is itself" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    folder.parent_id = folder.id

    assert_not folder.valid?
    assert_includes folder.errors[:parent_id], "can't be this folder or one of its own descendants"
  end

  test "is invalid when its parent is one of its own descendants" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    child = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Child", parent: root)
    grandchild = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Grandchild", parent: child)

    root.parent_id = grandchild.id

    assert_not root.valid?
    assert_includes root.errors[:parent_id], "can't be this folder or one of its own descendants"
  end

  test "is invalid when its project differs from its parent's project" do
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    parent = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root", project: project)
    child = Folder.new(team: @team, creator: @user, item_type: "Page", title: "Child", parent: parent)

    assert_not child.valid?
    assert child.errors.of_kind?(:project_id, :project_set_by_folder)

    child.project = project
    assert child.valid?
  end

  test "is invalid when its project belongs to another team" do
    other_team = Team.create!(name: "Marketing", password: "supersecret")
    Membership.create!(user: @user, team: other_team, role: "owner", nickname: "alice")
    project = Project.create!(team: other_team, name: "Apollo", owner: @user, creator: @user)
    folder = Folder.new(team: @team, creator: @user, item_type: "Page", title: "Root", project: project)

    assert_not folder.valid?
    assert_includes folder.errors[:project], "must belong to the same team"
  end

  test "parent and children associations reflect nesting" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    child = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Child", parent: root)

    assert_equal [ child ], root.children
    assert_equal root, child.parent
  end

  test "pages and diagrams associations only include items of the folder's own item_type" do
    page_folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Pages root")
    page = Page.create!(team: @team, creator: @user, title: "Notes", content: "", folder: page_folder)

    assert_equal [ page ], page_folder.pages
    assert_empty page_folder.diagrams
  end
end
