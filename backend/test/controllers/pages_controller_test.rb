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
end
