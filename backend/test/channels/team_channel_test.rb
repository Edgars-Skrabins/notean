require "test_helper"

class TeamChannelTest < ActionCable::Channel::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @user, nickname: "Alice")
  end

  test "a team member subscribes to the team's stream" do
    stub_connection current_user: @user

    subscribe team_code: @team.code

    assert subscription.confirmed?
    assert_has_stream "team:#{@team.id}"
  end

  test "a user outside the team is rejected" do
    stub_connection current_user: User.create!(email: "mallory@example.com", password: "supersecret")

    subscribe team_code: @team.code

    assert subscription.rejected?
  end

  test "a removed member is rejected" do
    @user.all_memberships.first.update!(removed_at: Time.current)
    stub_connection current_user: @user

    subscribe team_code: @team.code

    assert subscription.rejected?
  end

  test "an unknown team is rejected" do
    stub_connection current_user: @user

    subscribe team_code: "doesnotexist"

    assert subscription.rejected?
  end
end
