require "test_helper"

class ProjectTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @owner, role: "owner", nickname: "Alice")
  end

  def project(name: "Game", owner: @owner, team: @team)
    Project.create!(team: team, name: name, owner: owner, creator: @owner)
  end

  test "names are unique per team regardless of case" do
    project(name: "Game")

    duplicate = Project.new(team: @team, name: "GAME", owner: @owner, creator: @owner)
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:name], "has already been taken"
  end

  test "accepts a name at the length limit and rejects one over it" do
    assert Project.new(team: @team, name: "a" * ContentLimits::TITLE_MAX_LENGTH, owner: @owner, creator: @owner).valid?

    record = Project.new(team: @team, name: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1), owner: @owner, creator: @owner)
    assert_not record.valid?
    assert record.errors.of_kind?(:name, :too_long)
  end

  test "accepts a description at the length limit and rejects one over it" do
    assert Project.new(team: @team, name: "Game", description: "a" * ContentLimits::DESCRIPTION_MAX_LENGTH, owner: @owner, creator: @owner).valid?

    record = Project.new(team: @team, name: "Game", description: "a" * (ContentLimits::DESCRIPTION_MAX_LENGTH + 1), owner: @owner, creator: @owner)
    assert_not record.valid?
    assert record.errors.of_kind?(:description, :too_long)
  end

  test "the same name is allowed in another team" do
    project(name: "Game")
    other = Team.create!(name: "Other", password: "supersecret")
    Membership.create!(team: other, user: @owner, nickname: "Alice")

    assert Project.new(team: other, name: "Game", owner: @owner, creator: @owner).valid?
  end

  test "the owner must be a team member and is always a project member" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")
    assert_not Project.new(team: @team, name: "Game", owner: outsider, creator: @owner).valid?

    created = project
    assert_equal [ @owner ], created.members.to_a
  end

  test "the owner's membership row cannot be removed while the project exists" do
    created = project

    assert_not created.project_members.find_by(user: @owner).destroy
    assert_equal 1, created.project_members.count
  end

  test "destroying the project removes its members and keeps its items without a project" do
    created = project
    page = Page.create!(team: @team, creator: @owner, title: "Notes", content: "", project: created)

    created.destroy

    assert_equal 0, ProjectMember.count
    assert_nil page.reload.project_id
  end

  test "an item's project must belong to the item's team" do
    other = Team.create!(name: "Other", password: "supersecret")
    Membership.create!(team: other, user: @owner, role: "owner", nickname: "Alice")
    foreign_project = project(team: other)

    page = Page.new(team: @team, creator: @owner, title: "Notes", content: "", project: foreign_project)
    assert_not page.valid?
    assert_includes page.errors[:project], "must belong to the same team"
  end
end
