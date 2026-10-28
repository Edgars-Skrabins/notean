require "test_helper"

class CommentTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
  end

  def build_comment(body, commentable: @page)
    Comment.new(team: @team, commentable: commentable, creator: @user, body: body)
  end

  test "rejects a body without visible text" do
    [ "", "<p></p>", "<p>  <br></p>" ].each do |body|
      comment = build_comment(body)
      assert_not comment.valid?
      assert comment.errors.of_kind?(:body, :blank)
    end
  end

  test "limits the visible text, not the markup" do
    assert build_comment("<p><strong>#{"a" * ContentLimits::DESCRIPTION_MAX_LENGTH}</strong></p>").valid?

    comment = build_comment("<p>#{"a" * (ContentLimits::DESCRIPTION_MAX_LENGTH + 1)}</p>")
    assert_not comment.valid?
    assert comment.errors.of_kind?(:body, :too_long)
  end

  test "rejects markup over the byte limit" do
    comment = build_comment("<p>a</p>" + "<p><br></p>" * (Comment::BODY_MAX_BYTES / 11 + 1))

    assert_not comment.valid?
    assert comment.errors.of_kind?(:body, :too_long)
  end

  test "rejects a commentable from another team" do
    other_team = Team.create!(name: "Design", password: "supersecret")
    other_page = Page.create!(team: other_team, creator: @user, title: "Elsewhere", content: "")

    assert_not build_comment("<p>Hi</p>", commentable: other_page).valid?
  end

  test "sets edited_at when the body changes, not on create" do
    comment = build_comment("<p>Hi</p>")
    comment.save!
    assert_nil comment.edited_at

    comment.update!(body: "<p>Hello</p>")
    assert_not_nil comment.edited_at
  end

  test "commenting leaves the item untouched" do
    updated_at = @page.updated_at
    lock_version = @page.lock_version

    build_comment("<p>Hi</p>").save!

    @page.reload
    assert_equal updated_at, @page.updated_at
    assert_equal lock_version, @page.lock_version
  end

  test "deleting an item deletes its comments and pins" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint")
    ticket = Ticket.create!(board: board, team: @team, created_by_user_id: @user.id, title: "Bug", position: 0)
    diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: "")
    pin = DiagramCommentPin.create!(team: @team, diagram: diagram, creator: @user, x: 10, y: 20)
    [ @page, ticket, pin ].each { |commentable| build_comment("<p>Hi</p>", commentable: commentable).save! }

    [ @page, board, diagram ].each(&:destroy!)

    assert_equal 0, Comment.count
    assert_equal 0, DiagramCommentPin.count
  end
end
