require "test_helper"

class MembershipTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @alice = User.create!(email: "alice@example.com", password: "supersecret")
    @bob = User.create!(email: "bob@example.com", password: "supersecret")
  end

  test "defaults to the user role" do
    membership = Membership.create!(team: @team, user: @alice, nickname: "Alice")

    assert_equal "user", membership.role
  end

  test "accepts admin and owner roles" do
    admin = Membership.create!(team: @team, user: @alice, nickname: "Alice", role: "admin")
    owner = Membership.create!(team: @team, user: @bob, nickname: "Bob", role: "user")

    assert admin.admin?
    assert_not owner.admin?
  end

  test "rejects a role outside user, admin, owner" do
    assert_raises(ArgumentError) do
      Membership.new(team: @team, user: @alice, role: "superadmin")
    end
  end

  test "only one owner is allowed per team" do
    Membership.create!(team: @team, user: @alice, nickname: "Alice", role: "owner")

    error = assert_raises(ActiveRecord::RecordNotUnique) do
      Membership.create!(team: @team, user: @bob, nickname: "Bob", role: "owner")
    end
    assert_match(/unique/i, error.message)
  end

  test "the same team can have an owner and separate admins" do
    Membership.create!(team: @team, user: @alice, nickname: "Alice", role: "owner")
    admin = Membership.create!(team: @team, user: @bob, nickname: "Bob", role: "admin")

    assert admin.persisted?
  end

  test "a user can own more than one team" do
    other_team = Team.create!(name: "Design", password: "supersecret")
    Membership.create!(team: @team, user: @alice, nickname: "Alice", role: "owner")
    second_ownership = Membership.create!(team: other_team, user: @alice, nickname: "Alice", role: "owner")

    assert second_ownership.persisted?
  end

  test "is invalid without a nickname" do
    membership = Membership.new(team: @team, user: @alice, nickname: nil)

    assert_not membership.valid?
    assert_includes membership.errors[:nickname], "can't be blank"
  end

  test "rejects a nickname shorter than 3 characters" do
    assert_not Membership.new(team: @team, user: @alice, nickname: "Al").valid?
  end

  test "accepts a nickname of exactly 3 characters" do
    assert Membership.new(team: @team, user: @alice, nickname: "Ali").valid?
  end

  test "accepts a nickname of exactly 30 characters" do
    assert Membership.new(team: @team, user: @alice, nickname: "a" * 30).valid?
  end

  test "rejects a nickname longer than 30 characters" do
    assert_not Membership.new(team: @team, user: @alice, nickname: "a" * 31).valid?
  end

  test "rejects digits, spaces and symbols in a nickname" do
    [ "Alice1", "Al ice", "Alice!", "Ali_ce", "Alīce" ].each do |nickname|
      assert_not Membership.new(team: @team, user: @alice, nickname: nickname).valid?, "expected #{nickname.inspect} to be invalid"
    end
  end

  test "strips surrounding whitespace from a nickname" do
    membership = Membership.create!(team: @team, user: @alice, nickname: "  Alice  ")

    assert_equal "Alice", membership.nickname
  end

  test "nickname must be unique within a team" do
    Membership.create!(team: @team, user: @alice, nickname: "Alice")
    duplicate = Membership.new(team: @team, user: @bob, nickname: "Alice")

    assert_not duplicate.valid?
    assert_includes duplicate.errors.details[:nickname].map { |error| error[:error] }, :taken
  end

  test "the same nickname is allowed in different teams" do
    other_team = Team.create!(name: "Design", password: "supersecret")
    Membership.create!(team: @team, user: @alice, nickname: "Alice")

    assert Membership.new(team: other_team, user: @bob, nickname: "Alice").valid?
  end

  test "nickname uniqueness is case-sensitive" do
    Membership.create!(team: @team, user: @alice, nickname: "Alice")

    assert Membership.new(team: @team, user: @bob, nickname: "alice").valid?
  end
end
