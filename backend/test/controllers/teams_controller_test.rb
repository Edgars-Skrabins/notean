require "test_helper"

class TeamsControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper

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
    assert_equal "NICKNAME_INVALID", JSON.parse(response.body)["code"]
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

  test "members is available to regular members" do
    bob = create_member(@team, "Bob")

    get "/teams/#{@team.code}/members", headers: { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: bob.id)}" }

    assert_response :success
    assert_equal [ "Alice", "Bob" ], JSON.parse(response.body)["members"].map { |member| member["nickname"] }.sort
  end

  test "members returns NOT_TEAM_MEMBER for someone outside the team" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    get "/teams/#{@team.code}/members", headers: { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: outsider.id)}" }

    assert_response :forbidden
    assert_equal "NOT_TEAM_MEMBER", JSON.parse(response.body)["code"]
  end

  test "renaming the team returns FORBIDDEN for a regular member" do
    bob = create_member(@team, "Bob")

    patch "/teams/#{@team.code}", params: { team: { name: "Renamed" } }, headers: { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: bob.id)}" }, as: :json

    assert_response :forbidden
    assert_equal "FORBIDDEN", JSON.parse(response.body)["code"]
  end

  test "destroy deletes the team and returns no content" do
    delete "/teams/#{@team.code}", headers: @headers

    assert_response :no_content
    assert_not Team.exists?(@team.id)
  end

  test "GET /teams/:code no longer exists" do
    get "/teams/#{@team.code}", headers: @headers

    assert_response :not_found
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
    assert_equal "NICKNAME_TAKEN", JSON.parse(response.body)["code"]
    assert_equal "Alice", @membership.reload.nickname
  end

  test "update_nickname returns 422 for an invalid nickname" do
    patch "/teams/#{@team.code}/nickname", params: { membership: { nickname: "Al" } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "NICKNAME_INVALID", JSON.parse(response.body)["code"]
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
    assert_equal "NOT_TEAM_MEMBER", JSON.parse(response.body)["code"]
  end

  test "update_nickname returns 404 for an unknown team" do
    patch "/teams/doesnotexist/nickname", params: { membership: { nickname: "Ally" } }, headers: @headers, as: :json

    assert_response :not_found
  end

  test "members runs the same number of queries for 1 and 10 members" do
    attach_avatar(@user)
    one = query_count { get "/teams/#{@team.code}/members", headers: @headers }

    9.times { |index| create_member(@team, nickname_for(index), with_avatar: index.zero?) }
    ten = query_count { get "/teams/#{@team.code}/members", headers: @headers }

    assert_equal 10, JSON.parse(response.body)["members"].length
    assert_equal one, ten
  end

  test "update_features lets the owner turn features off and on" do
    patch "/teams/#{@team.code}/features", params: { team: { boards_enabled: false, pages_enabled: false } }, headers: @headers, as: :json

    assert_response :success
    team = JSON.parse(response.body)["team"]
    assert_equal [ false, true, false ], team.values_at("pages_enabled", "diagrams_enabled", "boards_enabled")
    assert_not @team.reload.feature_enabled?(:boards)

    patch "/teams/#{@team.code}/features", params: { team: { boards_enabled: true } }, headers: @headers, as: :json

    assert @team.reload.feature_enabled?(:boards)
    assert_not @team.feature_enabled?(:pages)
  end

  test "update_features broadcasts the updated team on the team channel" do
    assert_broadcasts(TeamChannel.stream_name(@team), 1) do
      patch "/teams/#{@team.code}/features", params: { team: { diagrams_enabled: false } }, headers: @headers, as: :json
    end

    assert_broadcast_on(TeamChannel.stream_name(@team), { type: "features_changed", team: JSON.parse(response.body)["team"] })
  end

  test "update_features returns FORBIDDEN for admins and regular members" do
    admin = create_member(@team, "Ada")
    admin.memberships.find_by(team: @team).update!(role: "admin")
    bob = create_member(@team, "Bob")

    [ admin, bob ].each do |user|
      patch "/teams/#{@team.code}/features", params: { team: { boards_enabled: false } }, headers: { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: user.id)}" }, as: :json

      assert_response :forbidden
      assert_equal "FORBIDDEN", JSON.parse(response.body)["code"]
    end
    assert @team.reload.feature_enabled?(:boards)
  end
end
