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
end
