require "test_helper"

class NotificationChannelTest < ActionCable::Channel::TestCase
  test "a user subscribes to their own notification stream" do
    user = User.create!(email: "alice@example.com", password: "supersecret")
    stub_connection current_user: user

    subscribe

    assert subscription.confirmed?
    assert_has_stream "notifications:#{user.id}"
  end
end
