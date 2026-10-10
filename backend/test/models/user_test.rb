require "test_helper"

class UserTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(email: "alice@example.com", password: "supersecret")
  end

  test "effective_avatar_color is derived from the id until a colour is chosen" do
    assert_nil @user.avatar_color
    assert_equal User::AVATAR_COLORS[@user.id % User::AVATAR_COLORS.length], @user.effective_avatar_color
  end

  test "effective_avatar_color returns the chosen colour" do
    @user.update!(avatar_color: "purple")

    assert_equal "purple", @user.effective_avatar_color
  end

  test "is invalid with an unknown avatar colour" do
    @user.avatar_color = "magenta"

    assert_not @user.valid?
    assert_includes @user.errors[:avatar_color], "is not included in the list"
  end

  test "accepts a PNG avatar image under 2 MB" do
    @user.avatar_image.attach(io: file_fixture("avatar.png").open, filename: "avatar.png", content_type: "image/png")

    assert @user.valid?
  end

  test "rejects a GIF avatar image" do
    @user.avatar_image.attach(io: file_fixture("avatar.gif").open, filename: "avatar.gif", content_type: "image/gif")

    assert_not @user.valid?
    assert_includes @user.errors[:avatar_image], "must be a PNG, JPEG or WebP image"
  end

  test "rejects a PNG avatar image over 2 MB" do
    large_png = file_fixture("avatar.png").binread + ("\0" * 3.megabytes)
    @user.avatar_image.attach(io: StringIO.new(large_png), filename: "large.png", content_type: "image/png")

    assert_not @user.valid?
    assert_includes @user.errors[:avatar_image], "must be 2 MB or smaller"
  end
end
