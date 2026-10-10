require "test_helper"

class UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    token = JsonWebToken.encode(user_id: @user.id)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  test "settings default to showing favorites on home and in the sidebar" do
    get "/users/me/settings", headers: @headers

    assert_response :success
    settings = JSON.parse(response.body)["settings"]
    assert_equal true, settings["show_favorites_on_home"]
    assert_equal true, settings["show_favorites_in_sidebar"]
  end

  test "update_settings changes one setting and leaves the other" do
    patch "/users/me/settings",
      params: { settings: { show_favorites_on_home: false } },
      headers: @headers,
      as: :json

    assert_response :success
    assert_equal false, JSON.parse(response.body)["settings"]["show_favorites_on_home"]
    @user.reload
    assert_equal false, @user.show_favorites_on_home
    assert_equal true, @user.show_favorites_in_sidebar
  end

  test "update_settings rejects a missing value with 422" do
    patch "/users/me/settings",
      params: { settings: { show_favorites_on_home: nil } },
      headers: @headers,
      as: :json

    assert_response :unprocessable_entity
    assert_equal true, @user.reload.show_favorites_on_home
  end

  test "settings and update_settings return 401 without a token" do
    get "/users/me/settings"

    assert_response :unauthorized

    patch "/users/me/settings", params: { settings: { show_favorites_on_home: false } }, as: :json

    assert_response :unauthorized
  end
end
