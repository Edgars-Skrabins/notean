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
end
