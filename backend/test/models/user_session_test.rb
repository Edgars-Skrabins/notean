require "test_helper"

class UserSessionTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(email: "alice@example.com", password: "supersecret")
  end

  test "active includes sessions used within 30 days" do
    session = @user.user_sessions.create!(last_used_at: 29.days.ago)

    assert_includes UserSession.active, session
  end

  test "active excludes sessions idle for 30 days" do
    session = @user.user_sessions.create!(last_used_at: 30.days.ago - 1.minute)

    assert_not_includes UserSession.active, session
  end

  test "touch_if_stale! leaves a session used within the last hour unchanged" do
    used_at = 59.minutes.ago.change(usec: 0)
    session = @user.user_sessions.create!(last_used_at: used_at)

    session.touch_if_stale!

    assert_equal used_at, session.reload.last_used_at
  end

  test "touch_if_stale! records use once the last use is over an hour old" do
    session = @user.user_sessions.create!(last_used_at: 61.minutes.ago)

    freeze_time do
      session.touch_if_stale!

      assert_equal Time.current, session.reload.last_used_at
    end
  end

  test "deleting a user deletes their sessions" do
    @user.user_sessions.create!(last_used_at: Time.current)

    assert_difference -> { UserSession.count }, -1 do
      @user.destroy
    end
  end
end
