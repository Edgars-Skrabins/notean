require "test_helper"
require "minitest/mock"

class TeamTest < ActiveSupport::TestCase
  def build_team(attributes = {})
    Team.new({ name: "Engineering", password: "supersecret" }.merge(attributes))
  end

  test "is invalid without a name" do
    team = build_team(name: nil)

    assert_not team.valid?
    assert_includes team.errors[:name], "can't be blank"
  end

  test "is invalid without a code" do
    team = build_team
    team.save!
    team.code = nil

    assert_not team.valid?
    assert_includes team.errors[:code], "can't be blank"
  end

  test "generates a 32 character code when none is provided" do
    team = build_team
    team.save!

    assert_equal 32, team.code.length
  end

  test "does not overwrite an explicitly assigned code" do
    team = build_team(code: "custom-code")
    team.save!

    assert_equal "custom-code", team.code
  end

  test "retries generating a code when it collides with an existing one" do
    existing = build_team
    existing.save!

    attempts = [ existing.code, "brand-new-unique-code" ]
    SecureRandom.stub :alphanumeric, ->(*) { attempts.shift } do
      team = build_team
      team.save!

      assert_equal "brand-new-unique-code", team.code
    end
  end

  test "enables every feature by default" do
    team = build_team

    Team::FEATURES.each { |feature| assert team.feature_enabled?(feature) }
  end

  test "reports a disabled feature" do
    team = build_team(boards_enabled: false)

    assert_not team.feature_enabled?(:boards)
    assert team.feature_enabled?(:pages)
  end

  test "reports an unknown feature as disabled" do
    assert_not build_team.feature_enabled?(:projects)
  end
end
