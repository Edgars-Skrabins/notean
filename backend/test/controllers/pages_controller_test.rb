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

  test "index runs the same number of queries for 1 and 10 pages" do
    attach_avatar(@user)
    members = 3.times.map { |index| create_member(@team, nickname_for(index), with_avatar: index.zero?) }
    one = query_count { get "/teams/#{@team.code}/pages", headers: @headers }

    9.times { |index| Page.create!(team: @team, creator: members[index % 3], title: "Page #{index}", content: "") }
    ten = query_count { get "/teams/#{@team.code}/pages", headers: @headers }

    assert_equal 10, JSON.parse(response.body)["pages"].length
    assert_equal one, ten
  end

  test "show and update run the same number of queries for 1 and 10 contributors" do
    attach_avatar(@user)
    @page.page_contributors.create!(user: @user)
    show_one = query_count { get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers }
    update_one = query_count { patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { title: "Notes" } }, headers: @headers, as: :json }

    9.times { |index| @page.page_contributors.create!(user: create_member(@team, nickname_for(index), with_avatar: index.zero?)) }
    show_ten = query_count { get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers }
    update_ten = query_count { patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { title: "Notes" } }, headers: @headers, as: :json }

    assert_equal 10, JSON.parse(response.body)["page"]["contributors"].length
    assert_equal show_one, show_ten
    assert_equal update_one, update_ten
  end

  test "returns FEATURE_DISABLED when pages are turned off" do
    @team.update!(pages_enabled: false)

    get "/teams/#{@team.code}/pages", headers: @headers
    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, JSON.parse(response.body))

    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { title: "Changed" } }, headers: @headers, as: :json
    assert_response :forbidden
    assert_equal "Notes", @page.reload.title
  end

  test "serves pages again once they are turned back on" do
    @team.update!(pages_enabled: false)
    @team.update!(pages_enabled: true)

    get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers

    assert_response :success
  end
end
