require "test_helper"

class UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    token = session_token(@user)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  test "register rejects a password shorter than 8 characters with 422" do
    assert_no_difference "User.count" do
      post "/auth/register", params: { user: { email: "bob@example.com", password: "a" * 7 } }, as: :json
    end

    assert_response :unprocessable_entity
    assert_equal "PASSWORD_TOO_SHORT", JSON.parse(response.body)["code"]
  end

  test "me returns the user, default settings, avatar and no team" do
    get "/users/me", headers: @headers

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal({ "id" => @user.id, "email" => "alice@example.com" }, body["user"])
    assert_equal({ "show_favorites_on_home" => true, "show_favorites_in_sidebar" => true, "show_my_work_on_home" => true, "theme" => "purple_haze", "theme_mode" => "system" }, body["settings"])
    assert_equal({ "color" => @user.effective_avatar_color, "image_url" => nil }, body["avatar"])
    assert_nil body["team"]
  end

  test "me returns the most recently active team with role and nickname" do
    older = Team.create!(name: "Older", password: "supersecret")
    newer = Team.create!(name: "Newer", password: "supersecret")
    Membership.create!(user: @user, team: older, role: "owner", nickname: "Alice", last_active_at: 2.days.ago)
    Membership.create!(user: @user, team: newer, role: "admin", nickname: "Ally", last_active_at: 1.hour.ago)

    get "/users/me", headers: @headers

    team = JSON.parse(response.body)["team"]
    assert_equal "Newer", team["team"]["name"]
    assert_equal "admin", team["role"]
    assert_equal "Ally", team["nickname"]
    assert_not team["team"].key?("password_digest")
  end

  test "me returns 401 without a token" do
    get "/users/me"

    assert_response :unauthorized
    assert_equal "UNAUTHORIZED", JSON.parse(response.body)["code"]
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

  test "update_settings saves and returns the theme and mode" do
    patch "/users/me/settings",
      params: { settings: { theme: "graphite", theme_mode: "dark" } },
      headers: @headers,
      as: :json

    assert_response :success
    settings = JSON.parse(response.body)["settings"]
    assert_equal "graphite", settings["theme"]
    assert_equal "dark", settings["theme_mode"]
    @user.reload
    assert_equal "graphite", @user.theme
    assert_equal "dark", @user.theme_mode
  end

  test "update_settings rejects an unknown theme with 422 and changes nothing" do
    patch "/users/me/settings",
      params: { settings: { theme: "neon", theme_mode: "dark" } },
      headers: @headers,
      as: :json

    assert_response :unprocessable_entity
    assert_equal "SETTINGS_UPDATE_FAILED", JSON.parse(response.body)["code"]
    @user.reload
    assert_equal "purple_haze", @user.theme
    assert_equal "system", @user.theme_mode
  end

  test "update_settings rejects an unknown theme mode with 422" do
    patch "/users/me/settings",
      params: { settings: { theme_mode: "dim" } },
      headers: @headers,
      as: :json

    assert_response :unprocessable_entity
    assert_equal "SETTINGS_UPDATE_FAILED", JSON.parse(response.body)["code"]
    assert_equal "system", @user.reload.theme_mode
  end

  test "update_settings returns 401 without a token" do
    patch "/users/me/settings", params: { settings: { show_favorites_on_home: false } }, as: :json

    assert_response :unauthorized
  end

  test "update_avatar sets the colour" do
    patch "/users/me/avatar", params: { avatar: { color: "cyan" } }, headers: @headers

    assert_response :success
    assert_equal "cyan", JSON.parse(response.body)["avatar"]["color"]
    assert_equal "cyan", @user.reload.avatar_color
  end

  test "update_avatar rejects an unknown colour with 422" do
    patch "/users/me/avatar", params: { avatar: { color: "magenta" } }, headers: @headers

    assert_response :unprocessable_entity
    assert_equal "AVATAR_COLOR_INVALID", JSON.parse(response.body)["code"]
    assert_nil @user.reload.avatar_color
  end

  test "update_avatar uploads an image and returns its url" do
    patch "/users/me/avatar", params: { avatar: { image: fixture_file_upload("avatar.png", "image/png") } }, headers: @headers

    assert_response :success
    assert_match %r{\A/rails/active_storage/blobs/redirect/}, JSON.parse(response.body)["avatar"]["image_url"]
    assert @user.reload.avatar_image.attached?
  end

  test "update_avatar rejects an invalid image with 422 and keeps the old one" do
    patch "/users/me/avatar", params: { avatar: { image: fixture_file_upload("avatar.png", "image/png") } }, headers: @headers
    blob_id = @user.reload.avatar_image.blob.id

    patch "/users/me/avatar", params: { avatar: { image: fixture_file_upload("avatar.gif", "image/gif") } }, headers: @headers

    assert_response :unprocessable_entity
    assert_equal "AVATAR_IMAGE_INVALID", JSON.parse(response.body)["code"]
    assert_equal blob_id, @user.reload.avatar_image.blob.id
  end

  test "update_avatar removes the image and keeps the colour" do
    @user.update!(avatar_color: "brown")
    patch "/users/me/avatar", params: { avatar: { image: fixture_file_upload("avatar.png", "image/png") } }, headers: @headers

    patch "/users/me/avatar", params: { avatar: { remove_image: "true" } }, headers: @headers

    assert_response :success
    avatar = JSON.parse(response.body)["avatar"]
    assert_nil avatar["image_url"]
    assert_equal "brown", avatar["color"]
    assert_not @user.reload.avatar_image.attached?
  end

  test "update_avatar returns 401 without a token" do
    patch "/users/me/avatar", params: { avatar: { color: "red" } }

    assert_response :unauthorized
  end

  test "update_settings turns My Work on Home off" do
    patch "/users/me/settings", params: { settings: { show_my_work_on_home: false } }, headers: @headers, as: :json

    assert_response :success
    assert_equal false, JSON.parse(response.body)["settings"]["show_my_work_on_home"]
    assert_equal false, @user.reload.show_my_work_on_home
  end

  test "update_password changes the password so only the new one logs in" do
    patch "/users/me/password",
      params: { password: { current_password: "supersecret", new_password: "brandnewpass" } },
      headers: @headers,
      as: :json

    assert_response :no_content

    post "/auth/login", params: { user: { email: "alice@example.com", password: "brandnewpass" } }, as: :json
    assert_response :success

    post "/auth/login", params: { user: { email: "alice@example.com", password: "supersecret" } }, as: :json
    assert_response :unauthorized
  end

  test "update_password ends the user's other sessions and keeps the current one" do
    other_headers = { "Authorization" => "Bearer #{session_token(@user)}" }
    bob = User.create!(email: "bob@example.com", password: "supersecret")
    bob_headers = { "Authorization" => "Bearer #{session_token(bob)}" }

    patch "/users/me/password",
      params: { password: { current_password: "supersecret", new_password: "brandnewpass" } },
      headers: @headers,
      as: :json

    get "/users/me", headers: @headers
    assert_response :success
    get "/users/me", headers: other_headers
    assert_response :unauthorized
    get "/users/me", headers: bob_headers
    assert_response :success
  end

  test "a failed update_password keeps the user's other sessions" do
    other_headers = { "Authorization" => "Bearer #{session_token(@user)}" }

    patch "/users/me/password",
      params: { password: { current_password: "wrongpassword", new_password: "brandnewpass" } },
      headers: @headers,
      as: :json

    get "/users/me", headers: other_headers
    assert_response :success
  end

  test "update_password rejects a wrong current password with 422 and keeps the old one" do
    patch "/users/me/password",
      params: { password: { current_password: "wrongpassword", new_password: "brandnewpass" } },
      headers: @headers,
      as: :json

    assert_response :unprocessable_entity
    assert_equal "CURRENT_PASSWORD_INVALID", JSON.parse(response.body)["code"]
    assert @user.reload.authenticate("supersecret")
  end

  test "update_password rejects a new password shorter than 8 characters with 422" do
    patch "/users/me/password",
      params: { password: { current_password: "supersecret", new_password: "a" * 7 } },
      headers: @headers,
      as: :json

    assert_response :unprocessable_entity
    assert_equal "PASSWORD_TOO_SHORT", JSON.parse(response.body)["code"]
    assert @user.reload.authenticate("supersecret")
  end

  test "update_password rejects a blank new password with 422" do
    patch "/users/me/password",
      params: { password: { current_password: "supersecret", new_password: "" } },
      headers: @headers,
      as: :json

    assert_response :unprocessable_entity
    assert_equal "PASSWORD_TOO_SHORT", JSON.parse(response.body)["code"]
  end

  test "update_password returns 401 without a token" do
    patch "/users/me/password", params: { password: { current_password: "supersecret", new_password: "brandnewpass" } }, as: :json

    assert_response :unauthorized
  end
end
