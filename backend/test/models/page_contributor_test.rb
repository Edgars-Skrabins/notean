require "test_helper"

class PageContributorTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
  end

  test "is invalid when the same user is added to the same page twice" do
    PageContributor.create!(page: @page, user: @user)
    duplicate = PageContributor.new(page: @page, user: @user)

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:user_id], "has already been taken"
  end

  test "is valid when the same user contributes to a different page" do
    PageContributor.create!(page: @page, user: @user)
    other_page = Page.create!(team: @team, creator: @user, title: "Other notes", content: "")

    assert PageContributor.new(page: other_page, user: @user).valid?
  end
end
