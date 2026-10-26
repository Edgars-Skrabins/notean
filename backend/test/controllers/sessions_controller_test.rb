require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "alice@example.com", password: "supersecret")
  end

  test "login returns a token for valid credentials" do
    post "/auth/login", params: { user: { email: "alice@example.com", password: "supersecret" } }, as: :json

    assert_response :success
    assert JSON.parse(response.body)["token"].present?
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
