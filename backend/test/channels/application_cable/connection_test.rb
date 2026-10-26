require "test_helper"

module ApplicationCable
  class ConnectionTest < ActionCable::Connection::TestCase
    setup do
      @user = User.create!(email: "alice@example.com", password: "supersecret")
      @token = JsonWebToken.encode(user_id: @user.id)
    end

    test "connects with a valid token" do
      connect params: { token: @token }

      assert_equal @user, connection.current_user
    end

    test "rejects the token of a deleted user" do
      @user.anonymise!

      assert_reject_connection { connect params: { token: @token } }
    end
  end
end
