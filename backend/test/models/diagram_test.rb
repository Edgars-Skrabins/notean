require "test_helper"

class DiagramTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
  end

  test "is invalid without a title" do
    diagram = Diagram.new(team: @team, creator: @user, title: nil, content: "")

    assert_not diagram.valid?
    assert_includes diagram.errors[:title], "can't be blank"
  end

  test "is valid with a title" do
    diagram = Diagram.new(team: @team, creator: @user, title: "Onboarding flow", content: "")

    assert diagram.valid?
  end

  test "saving content updates search_text" do
    content = { cells: [ { attrs: { text: { text: "Start" } } } ] }.to_json
    diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: content)

    assert_equal "Start", diagram.search_text

    diagram.update!(content: { cells: [ { labels: [ { attrs: { label: { text: "yes" } } } ] } ] }.to_json)

    assert_equal "yes", diagram.reload.search_text
  end

  test "saving only the title leaves search_text alone" do
    diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: "")
    diagram.update_column(:search_text, "kept")

    diagram.update!(title: "Renamed")

    assert_equal "kept", diagram.reload.search_text
  end

  test "is invalid when its project differs from its folder's project" do
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Root", project: project)
    diagram = Diagram.new(team: @team, creator: @user, title: "Notes", content: "", folder: folder)

    assert_not diagram.valid?
    assert diagram.errors.of_kind?(:project_id, :project_set_by_folder)

    diagram.project = project
    assert diagram.valid?
  end
end
