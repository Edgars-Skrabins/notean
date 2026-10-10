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

  test "avatar returns the derived colour and no image by default" do
    get "/users/me/avatar", headers: @headers

    assert_response :success
    avatar = JSON.parse(response.body)["avatar"]
    assert_equal @user.effective_avatar_color, avatar["color"]
    assert_nil avatar["image_url"]
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
    assert_equal "Invalid color", JSON.parse(response.body)["statusMessage"]
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
    assert_equal "Invalid image", JSON.parse(response.body)["statusMessage"]
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

  test "avatar and update_avatar return 401 without a token" do
    get "/users/me/avatar"

    assert_response :unauthorized

    patch "/users/me/avatar", params: { avatar: { color: "red" } }

    assert_response :unauthorized
  end
end
