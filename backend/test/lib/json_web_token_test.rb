require "test_helper"

class JsonWebTokenTest < ActiveSupport::TestCase
  test "decodes a token back into its original payload" do
    token = JsonWebToken.encode(user_id: 42)

    decoded = JsonWebToken.decode(token)

    assert_equal 42, decoded[:user_id]
  end

  test "returns a hash with indifferent access" do
    token = JsonWebToken.encode(user_id: 42)

    decoded = JsonWebToken.decode(token)

    assert_equal decoded[:user_id], decoded["user_id"]
  end

  test "raises when the token has expired" do
    token = JsonWebToken.encode({ user_id: 42 }, 1.hour.ago)

    assert_raises(JWT::ExpiredSignature) do
      JsonWebToken.decode(token)
    end
  end

  test "raises when the token signature has been tampered with" do
    token = JsonWebToken.encode(user_id: 42)
    tampered = "#{token}tampered"

    assert_raises(JWT::DecodeError) do
      JsonWebToken.decode(tampered)
    end
  end

  test "raises for a malformed token" do
    assert_raises(JWT::DecodeError) do
      JsonWebToken.decode("not-a-real-token")
    end
  end
end
