require "test_helper"

class ActionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    owner = User.create!(email: "owner@example.com", password: "supersecret")
    Membership.create!(user: owner, team: @team, role: "owner", nickname: "Owner")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    token = JsonWebToken.encode(user_id: @user.id)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  test "join_team stores the nickname on the new membership and returns it" do
    post "/actions/jointeam", params: { team: { code: @team.code, password: "supersecret", nickname: "Alice" } }, headers: @headers, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "Alice", body["nickname"]
    assert_equal "user", body["role"]
    assert_equal "Alice", @team.memberships.find_by(user: @user).nickname
  end

  test "join_team returns 409 when the nickname is taken in the team" do
    assert_no_difference -> { Membership.count } do
      post "/actions/jointeam", params: { team: { code: @team.code, password: "supersecret", nickname: "Owner" } }, headers: @headers, as: :json
    end

    assert_response :conflict
    assert_equal "Nickname already taken in this team", JSON.parse(response.body)["statusMessage"]
  end

  test "join_team returns 422 for an invalid nickname" do
    assert_no_difference -> { Membership.count } do
      post "/actions/jointeam", params: { team: { code: @team.code, password: "supersecret", nickname: "Al1ce" } }, headers: @headers, as: :json
    end

    assert_response :unprocessable_entity
    assert_equal "Invalid nickname", JSON.parse(response.body)["statusMessage"]
  end

  test "re-joining keeps the existing nickname and ignores the submitted one" do
    Membership.create!(user: @user, team: @team, nickname: "Alice")

    post "/actions/jointeam", params: { team: { code: @team.code, password: "supersecret", nickname: "Ally" } }, headers: @headers, as: :json

    assert_response :success
    assert_equal "Alice", JSON.parse(response.body)["nickname"]
    assert_equal "Alice", @team.memberships.find_by(user: @user).nickname
  end

  test "join_team rejects a wrong password" do
    post "/actions/jointeam", params: { team: { code: @team.code, password: "wrong", nickname: "Alice" } }, headers: @headers, as: :json

    assert_response :unauthorized
  end
end
