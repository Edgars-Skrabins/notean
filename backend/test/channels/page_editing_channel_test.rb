require "test_helper"

class PageEditingChannelTest < ActionCable::Channel::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @user, nickname: "Alice")
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
  end

  test "a team member subscribes to the page's editing stream" do
    stub_connection current_user: @user

    subscribe page_id: @page.id

    assert subscription.confirmed?
    assert_has_stream "page_editing_#{@page.id}"
  end

  test "a user outside the team is rejected" do
    stub_connection current_user: User.create!(email: "mallory@example.com", password: "supersecret")

    subscribe page_id: @page.id

    assert subscription.rejected?
  end

  test "a missing page is rejected" do
    stub_connection current_user: @user

    subscribe page_id: 0

    assert subscription.rejected?
  end
end
