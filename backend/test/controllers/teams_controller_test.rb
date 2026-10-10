require "test_helper"

class TeamsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    @membership = Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    token = JsonWebToken.encode(user_id: @user.id)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  test "create stores the nickname on the owner membership and returns it" do
    post "/teams", params: { team: { name: "Design", password: "supersecret", nickname: "Ally" } }, headers: @headers, as: :json

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "Ally", body["nickname"]
    assert_equal "owner", body["role"]
    team = Team.find_by(code: body["team"]["code"])
    assert_equal "Ally", team.memberships.find_by(user: @user).nickname
  end

  test "create rejects an invalid nickname with 422 and leaves no team behind" do
    assert_no_difference -> { Team.count } do
      post "/teams", params: { team: { name: "Design", password: "supersecret", nickname: "A1" } }, headers: @headers, as: :json
    end

    assert_response :unprocessable_entity
    assert_equal "Invalid nickname", JSON.parse(response.body)["statusMessage"]
  end

  test "create rejects a missing nickname with 422 and leaves no team behind" do
    assert_no_difference -> { Team.count } do
      post "/teams", params: { team: { name: "Design", password: "supersecret" } }, headers: @headers, as: :json
    end

    assert_response :unprocessable_entity
  end

  test "mine, mine/all and activate return the nickname for the team" do
    get "/teams/mine", headers: @headers
    assert_equal "Alice", JSON.parse(response.body)["nickname"]

    get "/teams/mine/all", headers: @headers
    assert_equal [ "Alice" ], JSON.parse(response.body)["teams"].map { |team| team["nickname"] }

    post "/teams/#{@team.code}/activate", headers: @headers
    assert_equal "Alice", JSON.parse(response.body)["nickname"]
  end

  test "members returns each member's nickname and role" do
    bob = User.create!(email: "bob@example.com", password: "supersecret")
    Membership.create!(user: bob, team: @team, nickname: "Bob")

    get "/teams/#{@team.code}/members", headers: @headers

    assert_response :success
    members = JSON.parse(response.body)["members"]
    assert_equal [ [ "Alice", "owner" ], [ "Bob", "user" ] ], members.map { |member| [ member["nickname"], member["role"] ] }.sort
    assert_not members.first.key?("username")
  end

  test "members returns each member's avatar" do
    @user.update!(avatar_color: "pink")

    get "/teams/#{@team.code}/members", headers: @headers

    assert_response :success
    member = JSON.parse(response.body)["members"].first
    assert_equal({ "color" => "pink", "image_url" => nil }, member["avatar"])
  end

  test "update_nickname changes the current user's nickname in the team" do
    patch "/teams/#{@team.code}/nickname", params: { membership: { nickname: "Ally" } }, headers: @headers, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "Ally", body["nickname"]
    assert_equal "Nickname updated", body["statusMessage"]
    assert_equal "Ally", @membership.reload.nickname
  end

  test "update_nickname only changes the nickname in the given team" do
    other_team = Team.create!(name: "Design", password: "supersecret")
    other_membership = Membership.create!(user: @user, team: other_team, nickname: "Alice")

    patch "/teams/#{@team.code}/nickname", params: { membership: { nickname: "Ally" } }, headers: @headers, as: :json

    assert_equal "Alice", other_membership.reload.nickname
  end

  test "update_nickname returns 409 when another member already has the nickname" do
    bob = User.create!(email: "bob@example.com", password: "supersecret")
    Membership.create!(user: bob, team: @team, nickname: "Bob")

    patch "/teams/#{@team.code}/nickname", params: { membership: { nickname: "Bob" } }, headers: @headers, as: :json

    assert_response :conflict
    assert_equal "Nickname already taken in this team", JSON.parse(response.body)["statusMessage"]
    assert_equal "Alice", @membership.reload.nickname
  end

  test "update_nickname returns 422 for an invalid nickname" do
    patch "/teams/#{@team.code}/nickname", params: { membership: { nickname: "Al" } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "Invalid nickname", JSON.parse(response.body)["statusMessage"]
  end

  test "update_nickname returns 401 without a token" do
    patch "/teams/#{@team.code}/nickname", params: { membership: { nickname: "Ally" } }, as: :json

    assert_response :unauthorized
  end

  test "update_nickname returns 403 for a non-member" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")
    token = JsonWebToken.encode(user_id: outsider.id)

    patch "/teams/#{@team.code}/nickname", params: { membership: { nickname: "Mallory" } }, headers: { "Authorization" => "Bearer #{token}" }, as: :json

    assert_response :forbidden
  end

  test "update_nickname returns 404 for an unknown team" do
    patch "/teams/doesnotexist/nickname", params: { membership: { nickname: "Ally" } }, headers: @headers, as: :json

    assert_response :not_found
  end
end
