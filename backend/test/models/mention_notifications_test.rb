require "test_helper"

class MentionNotificationsTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @owner, role: "owner", nickname: "Alice")
    @bob = create_member(@team, "Bob")
    @carol = create_member(@team, "Carol")
    @board = Board.create!(team: @team, creator: @owner, title: "Board")
    @ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @owner.id, title: "Bug", position: 0)
  end

  test "notifies only newly mentioned people, never the actor, with a plain-text excerpt" do
    before = "Ask @[user:#{@bob.id}|Bob]"
    after = "Ask @[user:#{@bob.id}|Bob] and @[user:#{@carol.id}|Carol] about @[ticket:#{@ticket.id}|Bug], cc @[user:#{@owner.id}|Alice]"

    mentioned = MentionNotifications.call(item: @ticket, before: before, after: after, actor: @owner, html: false)

    assert_equal [ @carol.id ], mentioned
    notification = Notification.sole
    assert_equal [ "mentioned", @carol.id ], [ notification.kind, notification.user_id ]
    assert_equal "Ask @Bob and @Carol about @Bug, cc @Alice", notification.excerpt
  end

  test "skips people who can't see the item" do
    secret = Project.create!(team: @team, name: "Secret", owner: @owner, creator: @owner)
    @board.update!(project: secret)
    html = %(<p><span data-type="mention" data-mention-type="user" data-id="#{@bob.id}" data-label="Bob">@Bob</span></p>)

    MentionNotifications.call(item: @ticket, before: "", after: html, actor: @owner, html: true)

    assert_equal 0, Notification.count
  end

  test "creates nothing when no new person is mentioned" do
    text = "@[user:#{@bob.id}|Bob]"

    assert_equal [], MentionNotifications.call(item: @ticket, before: text, after: "#{text} again", actor: @owner, html: false)
    assert_equal 0, Notification.count
  end
end
