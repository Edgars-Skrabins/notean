require "test_helper"

class DiagramEditingChannelTest < ActionCable::Channel::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @user, nickname: "Alice")
    @diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: "")
  end

  test "a team member subscribes to the diagram's editing stream" do
    stub_connection current_user: @user

    subscribe diagram_id: @diagram.id

    assert subscription.confirmed?
    assert_has_stream "diagram_editing_#{@diagram.id}"
  end

  test "a user outside the team is rejected" do
    stub_connection current_user: User.create!(email: "mallory@example.com", password: "supersecret")

    subscribe diagram_id: @diagram.id

    assert subscription.rejected?
  end
end
