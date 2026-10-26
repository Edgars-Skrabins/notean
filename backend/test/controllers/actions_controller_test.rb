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

  test "join_team restores a removed member's old membership as a user with the new nickname" do
    old = Membership.create!(user: @user, team: @team, role: "admin", nickname: "Alice", removed_at: 1.day.ago, last_active_at: 2.days.ago)

    assert_no_difference -> { Membership.count } do
      post "/actions/jointeam", params: { team: { code: @team.code, password: "supersecret", nickname: "Alicia" } }, headers: @headers, as: :json
    end

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal [ "user", "Alicia" ], body.values_at("role", "nickname")
    old.reload
    assert_not old.removed?
    assert_equal [ "user", "Alicia" ], [ old.role, old.nickname ]
    assert_in_delta Time.current, old.last_active_at, 5.seconds
  end

  test "join_team returns 409 when a returning member picks another former member's nickname" do
    former = User.create!(email: "former@example.com", password: "supersecret")
    Membership.create!(user: former, team: @team, nickname: "Former", removed_at: 1.day.ago)
    Membership.create!(user: @user, team: @team, nickname: "Alice", removed_at: 1.day.ago)

    post "/actions/jointeam", params: { team: { code: @team.code, password: "supersecret", nickname: "Former" } }, headers: @headers, as: :json

    assert_response :conflict
    assert_equal "NICKNAME_TAKEN", JSON.parse(response.body)["code"]
    assert @team.all_memberships.find_by(user: @user).removed?
  end

  test "join_team for an active member keeps their role and nickname" do
    membership = Membership.create!(user: @user, team: @team, role: "admin", nickname: "Alice")

    post "/actions/jointeam", params: { team: { code: @team.code, password: "supersecret", nickname: "Other" } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ "admin", "Alice" ], JSON.parse(response.body).values_at("role", "nickname")
    assert_equal "Alice", membership.reload.nickname
  end

  test "join_team returns 409 when the nickname is taken in the team" do
    assert_no_difference -> { Membership.count } do
      post "/actions/jointeam", params: { team: { code: @team.code, password: "supersecret", nickname: "Owner" } }, headers: @headers, as: :json
    end

    assert_response :conflict
    assert_equal "NICKNAME_TAKEN", JSON.parse(response.body)["code"]
  end

  test "join_team returns 422 for an invalid nickname" do
    assert_no_difference -> { Membership.count } do
      post "/actions/jointeam", params: { team: { code: @team.code, password: "supersecret", nickname: "Al1ce" } }, headers: @headers, as: :json
    end

    assert_response :unprocessable_entity
    assert_equal "NICKNAME_INVALID", JSON.parse(response.body)["code"]
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
