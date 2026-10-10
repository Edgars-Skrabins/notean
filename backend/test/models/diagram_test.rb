require "test_helper"

class DiagramTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
  end

  test "is invalid without a title" do
    diagram = Diagram.new(team: @team, creator: @user, title: nil, content: "")

    assert_not diagram.valid?
    assert_includes diagram.errors[:title], "can't be blank"
  end

  test "is valid with a title" do
    diagram = Diagram.new(team: @team, creator: @user, title: "Onboarding flow", content: "")

    assert diagram.valid?
  end
end
