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

  test "a trashed page is rejected" do
    Trash.move(@page, @user)
    stub_connection current_user: @user

    subscribe page_id: @page.id

    assert subscription.rejected?
  end

  test "a user outside the team is rejected" do
    stub_connection current_user: User.create!(email: "mallory@example.com", password: "supersecret")

    subscribe page_id: @page.id

    assert subscription.rejected?
  end

  test "a removed member is rejected" do
    @user.all_memberships.first.update!(removed_at: Time.current)
    stub_connection current_user: @user

    subscribe page_id: @page.id

    assert subscription.rejected?
  end

  test "a missing page is rejected" do
    stub_connection current_user: @user

    subscribe page_id: 0

    assert subscription.rejected?
  end

  test "a member who cannot see the page's project is rejected" do
    project = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    @page.update!(project: project)
    bob = create_member(@team, "Bob")
    stub_connection current_user: bob

    subscribe page_id: @page.id

    assert subscription.rejected?
  end

  test "a member is rejected while pages are turned off" do
    @team.update!(pages_enabled: false)
    stub_connection current_user: @user

    subscribe page_id: @page.id

    assert subscription.rejected?
  end
end
