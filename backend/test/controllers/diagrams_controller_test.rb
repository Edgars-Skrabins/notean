require "test_helper"

class DiagramsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    @diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: "")
    token = JsonWebToken.encode(user_id: @user.id)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  test "index runs the same number of queries for 1 and 10 diagrams" do
    attach_avatar(@user)
    members = 3.times.map { |index| create_member(@team, nickname_for(index), with_avatar: index.zero?) }
    one = query_count { get "/teams/#{@team.code}/diagrams", headers: @headers }

    9.times { |index| Diagram.create!(team: @team, creator: members[index % 3], title: "Diagram #{index}", content: "") }
    ten = query_count { get "/teams/#{@team.code}/diagrams", headers: @headers }

    assert_equal 10, JSON.parse(response.body)["diagrams"].length
    assert_equal one, ten
  end

  test "show and update run the same number of queries for 1 and 10 contributors" do
    attach_avatar(@user)
    @diagram.diagram_contributors.create!(user: @user)
    show_one = query_count { get "/teams/#{@team.code}/diagrams/#{@diagram.id}", headers: @headers }
    update_one = query_count { patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { title: "Flow" } }, headers: @headers, as: :json }

    9.times { |index| @diagram.diagram_contributors.create!(user: create_member(@team, nickname_for(index), with_avatar: index.zero?)) }
    show_ten = query_count { get "/teams/#{@team.code}/diagrams/#{@diagram.id}", headers: @headers }
    update_ten = query_count { patch "/teams/#{@team.code}/diagrams/#{@diagram.id}", params: { diagram: { title: "Flow" } }, headers: @headers, as: :json }

    assert_equal 10, JSON.parse(response.body)["diagram"]["contributors"].length
    assert_equal show_one, show_ten
    assert_equal update_one, update_ten
  end

  test "returns FEATURE_DISABLED when diagrams are turned off" do
    @team.update!(diagrams_enabled: false)

    get "/teams/#{@team.code}/diagrams", headers: @headers
    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, JSON.parse(response.body))

    get "/teams/#{@team.code}/diagrams/#{@diagram.id}", headers: @headers
    assert_response :forbidden
  end

  test "diagrams stay available when only another feature is turned off" do
    @team.update!(pages_enabled: false, boards_enabled: false)

    get "/teams/#{@team.code}/diagrams/#{@diagram.id}", headers: @headers

    assert_response :success
  end

  test "create stores the content and folder" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Flows")
    content = { cells: [ { shape: "process", attrs: { text: { text: "Start" } } } ] }.to_json

    post "/teams/#{@team.code}/diagrams", params: { diagram: { title: "Flow", content: content, folder_id: folder.id } }, headers: @headers, as: :json

    assert_response :created
    diagram = Diagram.find(JSON.parse(response.body)["diagram"]["id"])
    assert_equal content, diagram.content
    assert_equal folder.id, diagram.folder_id
    assert_includes diagram.search_text, "Start"
    assert_empty diagram.contributors
  end

  test "create rejects a folder of another type" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Specs")

    assert_no_difference "Diagram.count" do
      post "/teams/#{@team.code}/diagrams", params: { diagram: { title: "Flow", folder_id: folder.id } }, headers: @headers, as: :json
    end

    assert_response :unprocessable_entity
    assert_equal({ "code" => "DIAGRAM_CREATE_FAILED" }, JSON.parse(response.body))
  end

  test "create rejects a folder from another team" do
    other_team = Team.create!(name: "Design", password: "supersecret")
    folder = Folder.create!(team: other_team, creator: @user, item_type: "Diagram", title: "Elsewhere")

    assert_no_difference "Diagram.count" do
      post "/teams/#{@team.code}/diagrams", params: { diagram: { title: "Flow", folder_id: folder.id } }, headers: @headers, as: :json
    end

    assert_response :unprocessable_entity
  end
end
