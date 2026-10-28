require "test_helper"

class DiagramCommentPinsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    @bob = create_member(@team, "Bob")
    @diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: "")
    @headers = { "Authorization" => "Bearer #{session_token(@user)}" }
  end

  def pins_url
    "/teams/#{@team.code}/diagrams/#{@diagram.id}/comment_pins"
  end

  def create_pin(comment_bodies, resolved: false)
    pin = DiagramCommentPin.create!(team: @team, diagram: @diagram, creator: @user, x: 10, y: 20, resolved_at: resolved ? Time.current : nil, resolver: resolved ? @bob : nil)
    comment_bodies.each { |body| Comment.create!(team: @team, commentable: pin, creator: @bob, body: body) }
    pin
  end

  def json
    JSON.parse(response.body)
  end

  test "create makes the pin with its first comment" do
    post pins_url, params: { comment_pin: { x: 12.5, y: -4, body: "<p>Look here</p>" } }, headers: @headers, as: :json

    assert_response :created
    pin = json["comment_pin"]
    assert_equal [ 12.5, -4.0 ], [ pin["x"], pin["y"] ]
    assert_equal 1, pin["comment_count"]
    assert_equal "<p>Look here</p>", pin["first_comment"]["body"]
    assert_equal json["comment"]["id"], pin["first_comment"]["id"]
    assert_equal 1, @diagram.comment_pins.count
  end

  test "create saves nothing when the body is invalid" do
    post pins_url, params: { comment_pin: { x: 1, y: 2, body: "<p></p>" } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "COMMENT_BODY_REQUIRED", json["code"]
    assert_equal 0, DiagramCommentPin.count
    assert_equal 0, Comment.count
  end

  test "any member who can see the diagram resolves and reopens a pin" do
    pin = create_pin([ "<p>One</p>" ])
    bob_headers = { "Authorization" => "Bearer #{session_token(@bob)}" }

    patch "/teams/#{@team.code}/comment_pins/#{pin.id}", params: { comment_pin: { resolved: true } }, headers: bob_headers, as: :json
    assert_response :success
    assert_not_nil json["comment_pin"]["resolved_at"]
    assert_equal "Bob", json["comment_pin"]["resolved_by"]["nickname"]

    patch "/teams/#{@team.code}/comment_pins/#{pin.id}", params: { comment_pin: { resolved: false } }, headers: bob_headers, as: :json
    assert_nil json["comment_pin"]["resolved_at"]
    assert_nil json["comment_pin"]["resolved_by"]
  end

  test "index lists every pin with its first comment and count" do
    open_pin = create_pin([ "<p>First</p>", "<p>Second</p>" ])
    resolved_pin = create_pin([ "<p>Done</p>" ], resolved: true)

    get pins_url, headers: @headers

    assert_response :success
    pins = json["comment_pins"]
    assert_equal [ open_pin.id, resolved_pin.id ], pins.map { |pin| pin["id"] }
    assert_equal [ 2, 1 ], pins.map { |pin| pin["comment_count"] }
    assert_equal [ "<p>First</p>", "<p>Done</p>" ], pins.map { |pin| pin["first_comment"]["body"] }
    assert_not_nil pins.last["resolved_at"]
  end

  test "pins of a hidden diagram are not found" do
    secret = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    @diagram.update!(project: secret)

    get pins_url, headers: { "Authorization" => "Bearer #{session_token(@bob)}" }

    assert_response :not_found
    assert_equal "DIAGRAM_NOT_FOUND", json["code"]
  end

  test "index runs the same number of queries for 1 and 10 pins" do
    attach_avatar(@bob)
    create_pin([ "<p>One</p>" ], resolved: true)
    one = query_count { get pins_url, headers: @headers }

    9.times { |index| create_pin([ "<p>#{index}</p>", "<p>Reply</p>" ], resolved: index.even?) }
    ten = query_count { get pins_url, headers: @headers }

    assert_equal 10, json["comment_pins"].length
    assert_equal one, ten
  end
end
