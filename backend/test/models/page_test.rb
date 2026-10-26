require "test_helper"

class PageTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
  end

  test "is invalid without a title" do
    page = Page.new(team: @team, creator: @user, title: nil, content: "")

    assert_not page.valid?
    assert_includes page.errors[:title], "can't be blank"
  end

  test "accepts a title at the length limit and rejects one over it" do
    assert Page.new(team: @team, creator: @user, title: "a" * ContentLimits::TITLE_MAX_LENGTH, content: "").valid?

    record = Page.new(team: @team, creator: @user, title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1), content: "")
    assert_not record.valid?
    assert record.errors.of_kind?(:title, :too_long)
  end

  test "accepts content at the size limit and rejects one byte over it" do
    assert Page.new(team: @team, creator: @user, title: "Notes", content: "a" * ContentLimits::CONTENT_MAX_BYTES).valid?

    record = Page.new(team: @team, creator: @user, title: "Notes", content: "a" * (ContentLimits::CONTENT_MAX_BYTES + 1))
    assert_not record.valid?
    assert record.errors.of_kind?(:content, :too_large)
  end

  test "is valid with a title" do
    page = Page.new(team: @team, creator: @user, title: "Notes", content: "")

    assert page.valid?
  end

  test "search_title matches case-insensitively and treats wildcards literally" do
    Page.create!(team: @team, creator: @user, title: "Release 50% done", content: "")
    Page.create!(team: @team, creator: @user, title: "Release 500 done", content: "")

    assert_equal [ "Release 50% done" ], @team.pages.search_title("50%").pluck(:title)
    assert_equal 2, @team.pages.search_title("RELEASE").count
  end

  test "saving content updates search_text" do
    page = Page.create!(team: @team, creator: @user, title: "Notes", content: "<p>Hello <em>world</em></p>")

    assert_equal "Hello world", page.search_text

    page.update!(content: "<p>Bye</p>")

    assert_equal "Bye", page.reload.search_text
  end

  test "saving only the title leaves search_text alone" do
    page = Page.create!(team: @team, creator: @user, title: "Notes", content: "<p>Hello</p>")
    page.update_column(:search_text, "kept")

    page.update!(title: "Renamed")

    assert_equal "kept", page.reload.search_text
  end

  test "is invalid when its project differs from its folder's project" do
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "alice")
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root", project: project)
    page = Page.new(team: @team, creator: @user, title: "Notes", content: "", folder: folder)

    assert_not page.valid?
    assert page.errors.of_kind?(:project_id, :project_set_by_folder)

    page.project = project
    assert page.valid?
  end
end
