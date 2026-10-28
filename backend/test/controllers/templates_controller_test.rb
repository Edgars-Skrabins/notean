require "test_helper"

class TemplatesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @owner, team: @team, role: "owner", nickname: "Alice")
    @member = create_member(@team, "Bob")
    @headers = auth(@owner)
  end

  def auth(user)
    { "Authorization" => "Bearer #{session_token(user)}" }
  end

  def create_template(attributes = {})
    Template.create!({ team: @team, creator: @owner, kind: "page", title: "Notes", content: "<p>Body</p>" }.merge(attributes))
  end

  def board_content(columns: [ "Ideas", "Done" ], priorities: [ { name: "Hot", color: "red" } ])
    { columns: columns, priorities: priorities }.to_json
  end

  def json
    JSON.parse(response.body)
  end

  test "index lists one kind ordered by name, without content, and searches by name" do
    create_template(title: "zeta")
    create_template(title: "Alpha")
    create_template(kind: "diagram", title: "Flow", content: "{}")

    get "/teams/#{@team.code}/templates?kind=page", headers: @headers

    assert_response :success
    assert_equal [ "Alpha", "zeta" ], json["templates"].map { |template| template["title"] }
    assert_not json["templates"].first.key?("content")
    assert_equal false, json["has_more"]

    get "/teams/#{@team.code}/templates?kind=page&search=alp", headers: @headers
    assert_equal [ "Alpha" ], json["templates"].map { |template| template["title"] }
  end

  test "index pages 50 templates at a time" do
    51.times { |index| create_template(title: format("Template %02d", index)) }

    get "/teams/#{@team.code}/templates?kind=page&offset=50", headers: @headers

    assert_equal [ "Template 50" ], json["templates"].map { |template| template["title"] }
    assert_equal false, json["has_more"]
  end

  test "index requires a known kind" do
    get "/teams/#{@team.code}/templates", headers: @headers

    assert_response :unprocessable_entity
    assert_equal({ "code" => "TEMPLATE_KIND_INVALID" }, json)
  end

  test "index runs the same number of queries for 1 and 10 templates" do
    attach_avatar(@member)
    create_template(creator: @member)
    one = query_count { get "/teams/#{@team.code}/templates?kind=page", headers: @headers }

    9.times { |index| create_template(title: "T#{index}", creator: create_member(@team, nickname_for(index), with_avatar: index.zero?)) }
    ten = query_count { get "/teams/#{@team.code}/templates?kind=page", headers: @headers }

    assert_equal 10, json["templates"].length
    assert_equal one, ten
  end

  test "templates of a disabled feature answer FEATURE_DISABLED" do
    template = create_template(kind: "diagram", content: "{}")
    @team.update!(diagrams_enabled: false)

    get "/teams/#{@team.code}/templates?kind=diagram", headers: @headers
    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, json)

    get "/teams/#{@team.code}/templates/#{template.id}", headers: @headers
    assert_response :forbidden

    get "/teams/#{@team.code}/templates?kind=page", headers: @headers
    assert_response :success
  end

  test "another team's template is not found" do
    other_team = Team.create!(name: "Other", password: "supersecret")
    template = Template.create!(team: other_team, creator: @owner, kind: "page", title: "Secret", content: "")

    get "/teams/#{@team.code}/templates/#{template.id}", headers: @headers

    assert_response :not_found
    assert_equal({ "code" => "TEMPLATE_NOT_FOUND" }, json)
  end

  test "create defaults the title, sanitises page content and returns the template" do
    post "/teams/#{@team.code}/templates", params: { template: { kind: "page", title: "", content: "<p>Hi</p><script>alert(1)</script>" } }, headers: auth(@member), as: :json

    assert_response :created
    assert_equal "Untitled", json["template"]["title"]
    assert_equal "<p>Hi</p>alert(1)", json["template"]["content"]
    assert_equal true, json["template"]["can_manage"]
    assert_equal "Bob", json["template"]["creator"]["nickname"]
  end

  test "page template content keeps no images" do
    post "/teams/#{@team.code}/templates", params: { template: { kind: "page", content: '<p>Logo<img src="/rails/active_storage/blobs/1/logo.png"></p>' } }, headers: @headers, as: :json
    assert_response :created
    assert_equal "<p>Logo</p>", json["template"]["content"]

    patch "/teams/#{@team.code}/templates/#{json["template"]["id"]}", params: { template: { content: '<h1>Title</h1><img src="x.png">', lock_version: 0 } }, headers: @headers, as: :json
    assert_response :success
    assert_equal "<h1>Title</h1>", json["template"]["content"]
  end

  test "create rejects invalid board content and too long titles" do
    post "/teams/#{@team.code}/templates", params: { template: { kind: "board", content: board_content(priorities: [ { name: "Hot", color: "pink" } ]) } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal({ "code" => "TEMPLATE_CONTENT_INVALID" }, json)

    post "/teams/#{@team.code}/templates", params: { template: { kind: "board", title: "a" * 201, content: board_content } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal({ "code" => "TITLE_TOO_LONG" }, json)
  end

  test "only the creator, admins and the owner can manage a template" do
    template = create_template(creator: @member)
    admin = create_member(@team, "Carol")
    admin.memberships.first.update!(role: "admin")
    other = create_member(@team, "Dave")

    get "/teams/#{@team.code}/templates/#{template.id}", headers: auth(other)
    assert_equal false, json["template"]["can_manage"]

    patch "/teams/#{@team.code}/templates/#{template.id}", params: { template: { title: "Mine", lock_version: 0 } }, headers: auth(other), as: :json
    assert_response :forbidden
    delete "/teams/#{@team.code}/templates/#{template.id}", headers: auth(other)
    assert_response :forbidden

    [ @member, admin, @owner ].each_with_index do |user, index|
      patch "/teams/#{@team.code}/templates/#{template.id}", params: { template: { title: "Edit #{index}", lock_version: template.reload.lock_version } }, headers: auth(user), as: :json
      assert_response :success
    end

    delete "/teams/#{@team.code}/templates/#{template.id}", headers: auth(admin)
    assert_response :no_content
    assert_not Template.exists?(template.id)
  end

  test "update requires the lock version and reports conflicts with the latest template" do
    template = create_template

    patch "/teams/#{@team.code}/templates/#{template.id}", params: { template: { content: "<p>New</p>" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal({ "code" => "LOCK_VERSION_REQUIRED" }, json)

    template.update!(title: "Changed elsewhere")
    patch "/teams/#{@team.code}/templates/#{template.id}", params: { template: { content: "<p>New</p>", lock_version: 0 } }, headers: @headers, as: :json
    assert_response :conflict
    assert_equal "EDIT_CONFLICT", json["code"]
    assert_equal "Changed elsewhere", json["template"]["title"]
  end
end
