require "test_helper"

class MembersControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper

  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = create_member(@team, "Owner")
    @owner.memberships.first.update!(role: "owner")
    @admin = create_member(@team, "Admin")
    @admin.memberships.first.update!(role: "admin")
    @bob = create_member(@team, "Bob")
  end

  def headers_for(user)
    { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: user.id)}" }
  end

  def membership(user)
    @team.all_memberships.find_by(user: user)
  end

  def error_code
    JSON.parse(response.body)["code"]
  end

  test "the owner removes a member and gets the active members back" do
    delete "/teams/#{@team.code}/members/#{@bob.id}", headers: headers_for(@owner)

    assert_response :success
    assert_equal [ "Admin", "Owner" ], JSON.parse(response.body)["members"].map { |m| m["nickname"] }.sort
    assert membership(@bob).removed?
  end

  test "the owner removes an admin" do
    delete "/teams/#{@team.code}/members/#{@admin.id}", headers: headers_for(@owner)

    assert_response :success
    assert membership(@admin).removed?
  end

  test "an admin removes a regular user" do
    delete "/teams/#{@team.code}/members/#{@bob.id}", headers: headers_for(@admin)

    assert_response :success
    assert membership(@bob).removed?
  end

  test "an admin cannot remove another admin" do
    other_admin = create_member(@team, "Other")
    other_admin.memberships.first.update!(role: "admin")

    delete "/teams/#{@team.code}/members/#{other_admin.id}", headers: headers_for(@admin)

    assert_response :forbidden
    assert_equal "CANNOT_MANAGE_ADMIN", error_code
    assert_not membership(other_admin).removed?
  end

  test "nobody can remove the owner" do
    [ @owner, @admin ].each do |actor|
      delete "/teams/#{@team.code}/members/#{@owner.id}", headers: headers_for(actor)

      assert_response :unprocessable_entity
      assert_equal "CANNOT_REMOVE_OWNER", error_code
    end
    assert_not membership(@owner).removed?
  end

  test "a regular user cannot remove anyone" do
    delete "/teams/#{@team.code}/members/#{@admin.id}", headers: headers_for(@bob)

    assert_response :forbidden
    assert_equal "FORBIDDEN", error_code
  end

  test "removing an unknown or already removed user returns MEMBER_NOT_FOUND" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")
    membership(@bob).update!(removed_at: Time.current)

    [ outsider, @bob ].each do |target|
      delete "/teams/#{@team.code}/members/#{target.id}", headers: headers_for(@owner)

      assert_response :not_found
      assert_equal "MEMBER_NOT_FOUND", error_code
    end
  end

  test "the owner promotes a user to admin and demotes them again" do
    patch "/teams/#{@team.code}/members/#{@bob.id}/role", params: { membership: { role: "admin" } }, headers: headers_for(@owner), as: :json

    assert_response :success
    assert_equal "admin", JSON.parse(response.body)["members"].find { |m| m["id"] == @bob.id }["role"]

    patch "/teams/#{@team.code}/members/#{@bob.id}/role", params: { membership: { role: "user" } }, headers: headers_for(@owner), as: :json

    assert_response :success
    assert_equal "user", membership(@bob).role
  end

  test "only the owner changes roles" do
    [ @admin, @bob ].each do |actor|
      patch "/teams/#{@team.code}/members/#{@bob.id}/role", params: { membership: { role: "admin" } }, headers: headers_for(actor), as: :json

      assert_response :forbidden
    end
    assert_equal "user", membership(@bob).role
  end

  test "changing a role to owner or anything else, or changing the owner's role, returns ROLE_INVALID" do
    [ [ @bob, "owner" ], [ @bob, "superadmin" ], [ @owner, "admin" ] ].each do |target, role|
      patch "/teams/#{@team.code}/members/#{target.id}/role", params: { membership: { role: role } }, headers: headers_for(@owner), as: :json

      assert_response :unprocessable_entity
      assert_equal "ROLE_INVALID", error_code
    end
    assert_equal "owner", membership(@owner).role
  end

  test "transferring ownership makes the target the owner and the old owner an admin" do
    post "/teams/#{@team.code}/transfer_ownership", params: { membership: { user_id: @bob.id } }, headers: headers_for(@owner), as: :json

    assert_response :success
    assert_equal "admin", JSON.parse(response.body)["role"]
    assert_equal "owner", membership(@bob).role
    assert_equal "admin", membership(@owner).role
    assert_equal 1, @team.memberships.where(role: "owner").count
  end

  test "transferring ownership to yourself returns CANNOT_TRANSFER_TO_SELF" do
    post "/teams/#{@team.code}/transfer_ownership", params: { membership: { user_id: @owner.id } }, headers: headers_for(@owner), as: :json

    assert_response :unprocessable_entity
    assert_equal "CANNOT_TRANSFER_TO_SELF", error_code
  end

  test "transferring ownership to a removed member returns MEMBER_NOT_FOUND" do
    membership(@bob).update!(removed_at: Time.current)

    post "/teams/#{@team.code}/transfer_ownership", params: { membership: { user_id: @bob.id } }, headers: headers_for(@owner), as: :json

    assert_response :not_found
    assert_equal "MEMBER_NOT_FOUND", error_code
    assert_equal "owner", membership(@owner).role
  end

  test "only the owner transfers ownership" do
    post "/teams/#{@team.code}/transfer_ownership", params: { membership: { user_id: @bob.id } }, headers: headers_for(@admin), as: :json

    assert_response :forbidden
    assert_equal "owner", membership(@owner).role
  end

  test "a regular user leaves the team" do
    post "/teams/#{@team.code}/leave", headers: headers_for(@bob)

    assert_response :no_content
    assert membership(@bob).removed?
  end

  test "the owner cannot leave" do
    post "/teams/#{@team.code}/leave", headers: headers_for(@owner)

    assert_response :unprocessable_entity
    assert_equal "OWNER_CANNOT_LEAVE", error_code
    assert_not membership(@owner).removed?
  end

  test "a removed member gets NOT_TEAM_MEMBER on team endpoints" do
    membership(@bob).update!(removed_at: Time.current)

    get "/teams/#{@team.code}/members", headers: headers_for(@bob)
    assert_response :forbidden
    assert_equal "NOT_TEAM_MEMBER", error_code

    get "/teams/#{@team.code}/pages", headers: headers_for(@bob)
    assert_response :forbidden
    assert_equal "NOT_TEAM_MEMBER", error_code

    post "/teams/#{@team.code}/leave", headers: headers_for(@bob)
    assert_response :forbidden
    assert_equal "NOT_TEAM_MEMBER", error_code
  end

  test "a removed member is left out of the members list" do
    membership(@bob).update!(removed_at: Time.current)

    get "/teams/#{@team.code}/members", headers: headers_for(@owner)

    assert_not_includes JSON.parse(response.body)["members"].map { |m| m["id"] }, @bob.id
  end

  test "removing and leaving broadcast member_removed with the user and team" do
    expected = ->(user) { { type: "member_removed", user_id: user.id, team: @team.reload.as_json(except: [ :password, :password_digest ]) } }

    assert_broadcast_on(TeamChannel.stream_name(@team), expected.call(@bob)) do
      delete "/teams/#{@team.code}/members/#{@bob.id}", headers: headers_for(@owner)
    end

    assert_broadcast_on(TeamChannel.stream_name(@team), expected.call(@admin)) do
      post "/teams/#{@team.code}/leave", headers: headers_for(@admin)
    end
  end

  test "role changes and transfers broadcast members_changed" do
    assert_broadcast_on(TeamChannel.stream_name(@team), { type: "members_changed" }) do
      patch "/teams/#{@team.code}/members/#{@bob.id}/role", params: { membership: { role: "admin" } }, headers: headers_for(@owner), as: :json
    end

    assert_broadcast_on(TeamChannel.stream_name(@team), { type: "members_changed" }) do
      post "/teams/#{@team.code}/transfer_ownership", params: { membership: { user_id: @bob.id } }, headers: headers_for(@owner), as: :json
    end
  end

  test "removing a member runs the same number of queries for 1 and 10 remaining members" do
    small_team = Team.create!(name: "Small", password: "supersecret")
    owner = create_member(small_team, "Lead")
    owner.memberships.first.update!(role: "owner")
    attach_avatar(owner)
    first = create_member(small_team, "Leaving")

    one = query_count { delete "/teams/#{small_team.code}/members/#{first.id}", headers: headers_for(owner) }
    assert_equal 1, JSON.parse(response.body)["members"].length

    second = create_member(small_team, "Departing")
    9.times { |index| create_member(small_team, nickname_for(index), with_avatar: index.zero?) }
    ten = query_count { delete "/teams/#{small_team.code}/members/#{second.id}", headers: headers_for(owner) }

    assert_equal 10, JSON.parse(response.body)["members"].length
    assert_equal one, ten
  end
end
