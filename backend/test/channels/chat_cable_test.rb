require "test_helper"

class ChatCableTest < ActionCable::Channel::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = create_member(@team, "Alice")
    @other = create_member(@team, "Bob")
    @outsider = create_member(@team, "Carol")
    @channel = ChatChannel.create!(team: @team, creator: @user, name: "Pair", scope: "users")
    @channel.chat_channel_members.create!(user: @user)
    @channel.chat_channel_members.create!(user: @other)
  end

  test "a member streams their own chat stream for the team" do
    stub_connection current_user: @user

    subscribe team_code: @team.code

    assert subscription.confirmed?
    assert_has_stream ChatCable.stream_name(@team, @user.id)
  end

  test "outsiders and teams with chat off are rejected" do
    stub_connection current_user: User.create!(email: "mallory@example.com", password: "supersecret")
    subscribe team_code: @team.code
    assert subscription.rejected?

    @team.update!(chat_enabled: false)
    stub_connection current_user: @user
    subscribe team_code: @team.code
    assert subscription.rejected?
  end

  test "typing reaches the channel's other viewers only" do
    stub_connection current_user: @user
    subscribe team_code: @team.code

    assert_broadcasts(ChatCable.stream_name(@team, @other.id), 1) do
      assert_no_broadcasts(ChatCable.stream_name(@team, @outsider.id)) do
        assert_no_broadcasts(ChatCable.stream_name(@team, @user.id)) do
          perform :typing, chat_channel_id: @channel.id
        end
      end
    end
  end

  test "typing in a channel the user cannot see is ignored" do
    stub_connection current_user: @outsider
    subscribe team_code: @team.code

    assert_no_broadcasts(ChatCable.stream_name(@team, @other.id)) do
      perform :typing, chat_channel_id: @channel.id
    end
  end
end
