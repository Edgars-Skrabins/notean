require "test_helper"

class DiagramContributorTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    @diagram = Diagram.create!(team: @team, creator: @user, title: "Onboarding flow", content: "")
  end

  test "is invalid when the same user is added to the same diagram twice" do
    DiagramContributor.create!(diagram: @diagram, user: @user)
    duplicate = DiagramContributor.new(diagram: @diagram, user: @user)

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:user_id], "has already been taken"
  end

  test "is valid when the same user contributes to a different diagram" do
    DiagramContributor.create!(diagram: @diagram, user: @user)
    other_diagram = Diagram.create!(team: @team, creator: @user, title: "Other flow", content: "")

    assert DiagramContributor.new(diagram: other_diagram, user: @user).valid?
  end
end
