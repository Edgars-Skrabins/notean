require "test_helper"

class UserTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(email: "alice@example.com", password: "supersecret")
  end

  test "is invalid with a password shorter than 8 characters" do
    user = User.new(email: "bob@example.com", password: "a" * 7)

    assert_not user.valid?
    assert user.errors.of_kind?(:password, :too_short)
  end

  test "is valid with an 8 character password" do
    assert User.new(email: "bob@example.com", password: "a" * 8).valid?
  end

  test "stays valid when another attribute changes without a password" do
    user = User.find(@user.id)
    user.theme = "graphite"

    assert user.valid?
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

  test "defaults to the purple haze theme in system mode" do
    assert_equal "purple_haze", @user.theme
    assert_equal "system", @user.theme_mode
    assert @user.valid?
  end

  test "is invalid with an unknown theme" do
    @user.theme = "neon"

    assert_not @user.valid?
    assert_includes @user.errors[:theme], "is not included in the list"
  end

  test "is invalid with an unknown theme mode" do
    @user.theme_mode = "dim"

    assert_not @user.valid?
    assert_includes @user.errors[:theme_mode], "is not included in the list"
  end

  test "accepts a PNG avatar image under 256 kB" do
    @user.avatar_image.attach(io: file_fixture("avatar.png").open, filename: "avatar.png", content_type: "image/png")

    assert @user.valid?
  end

  test "rejects a GIF avatar image" do
    @user.avatar_image.attach(io: file_fixture("avatar.gif").open, filename: "avatar.gif", content_type: "image/gif")

    assert_not @user.valid?
    assert_includes @user.errors[:avatar_image], "must be a PNG, JPEG or WebP image"
  end

  test "rejects a PNG avatar image over 256 kB" do
    large_png = file_fixture("avatar.png").binread + ("\0" * 300.kilobytes)
    @user.avatar_image.attach(io: StringIO.new(large_png), filename: "large.png", content_type: "image/png")

    assert_not @user.valid?
    assert_includes @user.errors[:avatar_image], "must be 256 kB or smaller"
  end

  test "active excludes deleted users" do
    deleted = User.create!(email: "bob@example.com", password: "supersecret", deleted_at: Time.current)

    assert_includes User.active, @user
    assert_not_includes User.active, deleted
    assert deleted.deleted?
    assert_not @user.deleted?
  end

  test "anonymise! scrubs the email, password, avatar and sets deleted_at" do
    attach_avatar(@user)
    @user.update!(avatar_color: "purple")

    @user.anonymise!
    @user.reload

    assert_equal "deleted-#{@user.id}@deleted.invalid", @user.email
    assert_not @user.authenticate("supersecret")
    assert_not @user.avatar_image.attached?
    assert_nil @user.avatar_color
    assert @user.deleted?
  end

  test "anonymise! soft-removes every membership and hands owned projects to each team's owner" do
    team = Team.create!(name: "Engineering", password: "supersecret")
    owner = create_member(team, "Owner")
    owner.memberships.first.update!(role: "owner")
    Membership.create!(user: @user, team: team, nickname: "Alice")
    other_team = Team.create!(name: "Design", password: "supersecret")
    other_owner = create_member(other_team, "Boss")
    other_owner.memberships.first.update!(role: "owner")
    Membership.create!(user: @user, team: other_team, nickname: "Alice")
    project = Project.create!(team: team, name: "Apollo", owner: @user, creator: @user)
    other_project = Project.create!(team: other_team, name: "Gemini", owner: @user, creator: @user)

    @user.anonymise!

    assert @user.all_memberships.reload.all?(&:removed?)
    assert_equal 2, @user.all_memberships.count
    assert_equal owner, project.reload.owner
    assert_equal other_owner, other_project.reload.owner
  end

  test "the original email can register again after anonymise!" do
    @user.anonymise!

    assert User.create!(email: "alice@example.com", password: "supersecret").persisted?
  end
end
