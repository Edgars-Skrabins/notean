require "test_helper"

class BoardChannelTest < ActionCable::Channel::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @user, nickname: "Alice")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
  end

  test "a team member subscribes to the board's stream" do
    stub_connection current_user: @user

    subscribe board_id: @board.id

    assert subscription.confirmed?
    assert_has_stream "board:#{@board.id}"
  end

  test "a user outside the team is rejected" do
    stub_connection current_user: User.create!(email: "mallory@example.com", password: "supersecret")

    subscribe board_id: @board.id

    assert subscription.rejected?
  end

  test "a removed member is rejected" do
    @user.all_memberships.first.update!(removed_at: Time.current)
    stub_connection current_user: @user

    subscribe board_id: @board.id

    assert subscription.rejected?
  end

  test "a missing board is rejected" do
    stub_connection current_user: @user

    subscribe board_id: 0

    assert subscription.rejected?
  end

  test "a member is rejected while boards are turned off" do
    @team.update!(boards_enabled: false)
    stub_connection current_user: @user

    subscribe board_id: @board.id

    assert subscription.rejected?
  end

  test "a member who cannot see the board's project is rejected" do
    project = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    @board.update!(project: project)
    stub_connection current_user: create_member(@team, "Bob")

    subscribe board_id: @board.id

    assert subscription.rejected?
  end
end
