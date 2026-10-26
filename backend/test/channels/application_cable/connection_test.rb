require "test_helper"

module ApplicationCable
  class ConnectionTest < ActionCable::Connection::TestCase
    setup do
      @user = User.create!(email: "alice@example.com", password: "supersecret")
      @session = @user.user_sessions.create!(last_used_at: Time.current)
    end

    def ticket_for(session, exp = 1.minute.from_now)
      JsonWebToken.encode({ session_id: session.id, purpose: "cable" }, exp)
    end

    test "connects with a valid ticket" do
      connect params: { ticket: ticket_for(@session) }

      assert_equal @user, connection.current_user
    end

    test "rejects an expired ticket" do
      ticket = ticket_for(@session)

      travel 61.seconds do
        assert_reject_connection { connect params: { ticket: ticket } }
      end
    end

    test "rejects a ticket for an ended session" do
      ticket = ticket_for(@session)
      @session.destroy

      assert_reject_connection { connect params: { ticket: ticket } }
    end

    test "rejects a ticket for a session idle for 30 days" do
      @session.update!(last_used_at: 31.days.ago)

      assert_reject_connection { connect params: { ticket: ticket_for(@session) } }
    end

    test "rejects a login token passed as token" do
      token = JsonWebToken.encode(session_id: @session.id)

      assert_reject_connection { connect params: { token: token } }
    end

    test "rejects a login token passed as ticket" do
      token = JsonWebToken.encode(session_id: @session.id)

      assert_reject_connection { connect params: { ticket: token } }
    end

    test "rejects a ticket of a deleted user" do
      @user.update!(deleted_at: Time.current)

      assert_reject_connection { connect params: { ticket: ticket_for(@session) } }
    end

    test "rejects a connection without a ticket" do
      assert_reject_connection { connect }
    end
  end
end
