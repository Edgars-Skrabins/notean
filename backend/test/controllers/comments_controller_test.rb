require "test_helper"

class CommentsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    @bob = create_member(@team, "Bob")
    @carol = create_member(@team, "Carol")
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint")
    @ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "Bug", position: 0)
    @diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: "")
    @pin = DiagramCommentPin.create!(team: @team, diagram: @diagram, creator: @user, x: 1, y: 2)
    @headers = headers_for(@user)
  end

  def headers_for(user)
    { "Authorization" => "Bearer #{session_token(user)}" }
  end

  def add_comment(commentable, user: @user, body: "<p>Hi</p>")
    Comment.create!(team: @team, commentable: commentable, creator: user, body: body)
  end

  def page_comments_url(page = @page)
    "/teams/#{@team.code}/pages/#{page.id}/comments"
  end

  def comment_url(comment)
    "/teams/#{@team.code}/comments/#{comment.id}"
  end

  def json
    JSON.parse(response.body)
  end

  test "index pages newest first with before_id" do
    comments = 52.times.map { |index| add_comment(@page, body: "<p>Comment #{index}</p>") }

    get page_comments_url, headers: @headers

    assert_response :success
    assert_equal comments.last(50).reverse.map(&:id), json["comments"].map { |comment| comment["id"] }
    assert json["has_more"]

    get page_comments_url, params: { before_id: comments[2].id }, headers: @headers

    assert_equal [ comments[1].id, comments[0].id ], json["comments"].map { |comment| comment["id"] }
    assert_not json["has_more"]
  end

  test "lists comments of tickets and pins" do
    ticket_comment = add_comment(@ticket)
    pin_comment = add_comment(@pin)

    get "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{@ticket.id}/comments", headers: @headers
    assert_equal [ ticket_comment.id ], json["comments"].map { |comment| comment["id"] }

    get "/teams/#{@team.code}/comment_pins/#{@pin.id}/comments", headers: @headers
    assert_equal [ pin_comment.id ], json["comments"].map { |comment| comment["id"] }
  end

  test "create sanitises the body and returns the comment with its author" do
    post page_comments_url, params: { comment: { body: "<p>Hi<script>alert(1)</script></p>" } }, headers: @headers, as: :json

    assert_response :created
    assert_equal "<p>Hialert(1)</p>", json["comment"]["body"]
    assert_equal "Alice", json["comment"]["author"]["nickname"]
    assert_nil json["comment"]["edited_at"]
  end

  test "create rejects an empty or too long body" do
    post page_comments_url, params: { comment: { body: "<p> </p>" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "COMMENT_BODY_REQUIRED", json["code"]

    post page_comments_url, params: { comment: { body: "a" * (ContentLimits::DESCRIPTION_MAX_LENGTH + 1) } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "DESCRIPTION_TOO_LONG", json["code"]
  end

  test "the item's feature must be on" do
    @team.update!(boards_enabled: false)

    post "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{@ticket.id}/comments", params: { comment: { body: "Hi" } }, headers: @headers, as: :json

    assert_response :forbidden
    assert_equal "FEATURE_DISABLED", json["code"]
  end

  test "items in a hidden project are not found" do
    secret = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    @page.update!(project: secret)
    comment = add_comment(@page)
    bob_headers = headers_for(@bob)

    get page_comments_url, headers: bob_headers
    assert_response :not_found
    assert_equal "PAGE_NOT_FOUND", json["code"]

    patch comment_url(comment), params: { comment: { body: "Edit" } }, headers: bob_headers, as: :json
    assert_response :not_found
    assert_equal "COMMENT_NOT_FOUND", json["code"]
  end

  test "non-members are rejected" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    get page_comments_url, headers: headers_for(outsider)

    assert_response :forbidden
  end

  test "a removed member's comment keeps their last nickname" do
    add_comment(@page, user: @bob)
    @bob.all_memberships.find_by(team: @team).remove!

    get page_comments_url, headers: @headers

    assert_equal "Bob", json["comments"].first["author"]["nickname"]
  end

  test "index runs the same number of queries for 1 and 10 comments" do
    attach_avatar(@user)
    add_comment(@page)
    one = query_count { get page_comments_url, headers: @headers }

    9.times { |index| add_comment(@page, user: [ @bob, @carol, @user ][index % 3]) }
    ten = query_count { get page_comments_url, headers: @headers }

    assert_equal 10, json["comments"].length
    assert_equal one, ten
  end

  test "only the author edits a comment" do
    comment = add_comment(@page, user: @bob)

    patch comment_url(comment), params: { comment: { body: "<p>Owner edit</p>" } }, headers: @headers, as: :json
    assert_response :forbidden
    assert_equal "FORBIDDEN", json["code"]

    patch comment_url(comment), params: { comment: { body: "<p>Fixed</p>" } }, headers: headers_for(@bob), as: :json
    assert_response :success
    assert_equal "<p>Fixed</p>", json["comment"]["body"]
    assert_not_nil json["comment"]["edited_at"]
  end

  test "the author, admins and the owner delete; other members do not" do
    comments = 3.times.map { add_comment(@page, user: @bob) }
    @carol.all_memberships.find_by(team: @team).update!(role: "admin")
    dave = create_member(@team, "Dave")

    delete comment_url(comments[0]), headers: headers_for(dave)
    assert_response :forbidden

    [ @bob, @carol, @user ].each_with_index do |user, index|
      delete comment_url(comments[index]), headers: headers_for(user)
      assert_response :no_content
    end
    assert_equal 0, @page.comments.count
  end

  test "deleting a pin's last comment deletes the pin" do
    first = add_comment(@pin)
    second = add_comment(@pin)

    delete comment_url(first), headers: @headers
    assert_response :no_content
    assert DiagramCommentPin.exists?(@pin.id)

    delete comment_url(second), headers: @headers
    assert_response :success
    assert json["comment_pin_deleted"]
    assert_not DiagramCommentPin.exists?(@pin.id)
  end
end
