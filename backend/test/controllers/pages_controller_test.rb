require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret", avatar_color: "blue")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
    token = JsonWebToken.encode(user_id: @user.id)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  test "show returns the creator with their avatar" do
    get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers

    assert_response :success
    creator = JSON.parse(response.body)["page"]["creator"]
    assert_equal "Alice", creator["nickname"]
    assert_equal({ "color" => "blue", "image_url" => nil }, creator["avatar"])
  end

  test "show returns only the payload without a message" do
    get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers

    assert_equal [ "page" ], JSON.parse(response.body).keys
  end

  test "show returns PAGE_NOT_FOUND for a missing page" do
    get "/teams/#{@team.code}/pages/0", headers: @headers

    assert_response :not_found
    assert_equal({ "code" => "PAGE_NOT_FOUND" }, JSON.parse(response.body))
  end

  test "returns NOT_TEAM_MEMBER for someone outside the team" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    get "/teams/#{@team.code}/pages", headers: { "Authorization" => "Bearer #{JsonWebToken.encode(user_id: outsider.id)}" }

    assert_response :forbidden
    assert_equal "NOT_TEAM_MEMBER", JSON.parse(response.body)["code"]
  end

  test "returns TEAM_NOT_FOUND for an unknown team" do
    get "/teams/doesnotexist/pages", headers: @headers

    assert_response :not_found
    assert_equal "TEAM_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "returns UNAUTHORIZED without a token" do
    get "/teams/#{@team.code}/pages"

    assert_response :unauthorized
    assert_equal "UNAUTHORIZED", JSON.parse(response.body)["code"]
  end
end
