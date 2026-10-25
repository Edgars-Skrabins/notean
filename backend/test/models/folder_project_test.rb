require "test_helper"

class FolderProjectTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    @project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
  end

  test "apply moves the folder, nested folders and their pages and diagrams to the project" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    child = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Child", parent: root)
    grandchild = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Grandchild", parent: child)
    root_page = Page.create!(team: @team, creator: @user, title: "Root page", content: "", folder: root)
    deep_page = Page.create!(team: @team, creator: @user, title: "Deep page", content: "", folder: grandchild)

    FolderProject.apply(root, @project.id)

    assert_equal [ @project.id ] * 3, [ root, child, grandchild ].map { |folder| folder.reload.project_id }
    assert_equal @project.id, root_page.reload.project_id
    assert_equal @project.id, deep_page.reload.project_id
  end

  test "apply moves diagrams inside the subtree" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Flows")
    diagram = Diagram.create!(team: @team, creator: @user, title: "Login flow", content: "", folder: root)

    FolderProject.apply(root, @project.id)

    assert_equal @project.id, diagram.reload.project_id
  end

  test "apply can make a subtree team-wide" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root", project: @project)
    page = Page.create!(team: @team, creator: @user, title: "Notes", content: "", folder: root, project: @project)

    FolderProject.apply(root, nil)

    assert_nil root.reload.project_id
    assert_nil page.reload.project_id
  end

  test "apply leaves other folder trees and top-level items alone" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    other = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Other")
    other_page = Page.create!(team: @team, creator: @user, title: "Other page", content: "", folder: other)
    loose_page = Page.create!(team: @team, creator: @user, title: "Loose page", content: "")

    FolderProject.apply(root, @project.id)

    assert_nil other.reload.project_id
    assert_nil other_page.reload.project_id
    assert_nil loose_page.reload.project_id
  end
end
