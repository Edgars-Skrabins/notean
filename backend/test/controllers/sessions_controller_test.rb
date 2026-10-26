require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "alice@example.com", password: "supersecret")
  end

  def headers_for(token)
    { "Authorization" => "Bearer #{token}" }
  end

  test "login creates a session and returns its token" do
    assert_difference -> { @user.user_sessions.count }, 1 do
      post "/auth/login", params: { user: { email: "alice@example.com", password: "supersecret" } }, as: :json
    end

    assert_response :success
    payload = JsonWebToken.decode(JSON.parse(response.body)["token"])
    assert_equal @user.user_sessions.last.id, payload[:session_id]
    assert_not payload.key?(:exp)
  end

  test "login deletes the user's expired sessions only" do
    expired = @user.user_sessions.create!(last_used_at: 31.days.ago)
    recent = @user.user_sessions.create!(last_used_at: 1.day.ago)
    other = User.create!(email: "bob@example.com", password: "supersecret")
    others_expired = other.user_sessions.create!(last_used_at: 31.days.ago)

    post "/auth/login", params: { user: { email: "alice@example.com", password: "supersecret" } }, as: :json

    assert_not UserSession.exists?(expired.id)
    assert UserSession.exists?(recent.id)
    assert UserSession.exists?(others_expired.id)
  end

  test "register creates a session and returns its token" do
    post "/auth/register", params: { user: { email: "bob@example.com", password: "supersecret" } }, as: :json

    assert_response :created
    bob = User.find_by(email: "bob@example.com")
    payload = JsonWebToken.decode(JSON.parse(response.body)["token"])
    assert_equal bob.user_sessions.sole.id, payload[:session_id]
  end

  test "a valid session authenticates and records use" do
    session = @user.user_sessions.create!(last_used_at: 2.hours.ago)

    get "/users/me", headers: headers_for(JsonWebToken.encode(session_id: session.id))

    assert_response :success
    assert_in_delta Time.current, session.reload.last_used_at, 5.seconds
  end

  test "a session idle for 31 days gets 401" do
    session = @user.user_sessions.create!(last_used_at: 31.days.ago)

    get "/users/me", headers: headers_for(JsonWebToken.encode(session_id: session.id))

    assert_response :unauthorized
  end

  test "a deleted session gets 401" do
    session = @user.user_sessions.create!(last_used_at: Time.current)
    token = JsonWebToken.encode(session_id: session.id)
    session.destroy

    get "/users/me", headers: headers_for(token)

    assert_response :unauthorized
  end

  test "a cable ticket used as a bearer token gets 401" do
    session = @user.user_sessions.create!(last_used_at: Time.current)
    ticket = JsonWebToken.encode({ session_id: session.id, purpose: "cable" }, 1.minute.from_now)

    get "/users/me", headers: headers_for(ticket)

    assert_response :unauthorized
  end

  test "logout ends the session so the same token gets 401" do
    token = session_token(@user)

    delete "/auth/session", headers: headers_for(token)

    assert_response :no_content
    get "/users/me", headers: headers_for(token)
    assert_response :unauthorized
  end

  test "logout leaves the user's other sessions active" do
    token = session_token(@user)
    other_token = session_token(@user)

    delete "/auth/session", headers: headers_for(token)

    get "/users/me", headers: headers_for(other_token)
    assert_response :success
  end

  test "logout without a session gets 401" do
    delete "/auth/session"

    assert_response :unauthorized
  end

  test "cable ticket is tied to the current session and expires after a minute" do
    token = session_token(@user)

    post "/auth/cable_ticket", headers: headers_for(token)

    assert_response :success
    ticket = JSON.parse(response.body)["ticket"]
    payload = JsonWebToken.decode(ticket)
    assert_equal JsonWebToken.decode(token)[:session_id], payload[:session_id]
    assert_equal "cable", payload[:purpose]

    travel 61.seconds do
      assert_raises(JWT::ExpiredSignature) { JsonWebToken.decode(ticket) }
    end
  end

  test "cable ticket without a session gets 401" do
    post "/auth/cable_ticket"

    assert_response :unauthorized
  end

  test "login rejects a deleted user even with matching credentials" do
    @user.update!(deleted_at: Time.current)

    post "/auth/login", params: { user: { email: "alice@example.com", password: "supersecret" } }, as: :json

    assert_response :unauthorized
    assert_equal "INVALID_CREDENTIALS", JSON.parse(response.body)["code"]
  end

  test "login with the original email fails after the account is anonymised" do
    @user.anonymise!

    post "/auth/login", params: { user: { email: "alice@example.com", password: "supersecret" } }, as: :json

    assert_response :unauthorized
    assert_equal "INVALID_CREDENTIALS", JSON.parse(response.body)["code"]
  end
end
