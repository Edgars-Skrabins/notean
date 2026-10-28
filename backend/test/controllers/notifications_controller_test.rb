require "test_helper"

class NotificationsControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper

  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @owner, role: "owner", nickname: "Alice")
    @user = create_member(@team, "Bob")
    @board = Board.create!(team: @team, creator: @owner, title: "Board")
    @headers = { "Authorization" => "Bearer #{session_token(@user)}" }
  end

  def notifications_url(suffix = nil)
    [ "/teams/#{@team.code}/notifications", suffix ].compact.join("/")
  end

  def json
    JSON.parse(response.body)
  end

  def notify(item: nil, user: @user, team: @team, occurred_at: Time.current, read_at: nil)
    item ||= Page.create!(team: team, creator: @owner, title: "Page", content: "")
    Notification.create!(user: user, team: team, actor: @owner, kind: "item_changed", item: item, item_title: item.title, changed_fields: [ "title" ], occurred_at: occurred_at, read_at: read_at)
  end

  test "index lists the newest first with the actor and the unread count" do
    older = notify(occurred_at: 2.hours.ago, read_at: 1.hour.ago)
    newer = notify(occurred_at: 1.minute.ago)

    get notifications_url, headers: @headers

    assert_response :ok
    assert_equal [ newer.id, older.id ], json["notifications"].map { |notification| notification["id"] }
    assert_equal [ false, true ], json["notifications"].map { |notification| notification["read"] }
    assert_equal "Alice", json["notifications"].first["actor"]["nickname"]
    assert_equal 1, json["unread_count"]
    assert_equal false, json["has_more"]
  end

  test "index filters unread and pages by 50" do
    51.times { notify }
    notify(read_at: Time.current)

    get notifications_url, params: { unread: true }, headers: @headers
    assert_equal 50, json["notifications"].length
    assert json["has_more"]

    get notifications_url, params: { unread: true, offset: 50 }, headers: @headers
    assert_equal 1, json["notifications"].length
    assert_not json["has_more"]
  end

  test "index hides notifications about items the user can't see" do
    secret = Project.create!(team: @team, name: "Secret", owner: @owner, creator: @owner)
    notify(item: Page.create!(team: @team, creator: @owner, title: "Hidden", content: "", project: secret))
    visible = notify

    get notifications_url, headers: @headers

    assert_equal [ visible.id ], json["notifications"].map { |notification| notification["id"] }
    assert_equal 1, json["unread_count"]
  end

  test "index marks tickets in the backlog" do
    column = Column.create!(board: @board, title: "To Do", position: 0)
    backlog = Ticket.create!(board: @board, team: @team, created_by_user_id: @owner.id, title: "Backlog", position: 0)
    in_column = Ticket.create!(board: @board, column: column, team: @team, created_by_user_id: @owner.id, title: "Column", position: 0)
    [ backlog, in_column ].each { |ticket| Notification.create!(user: @user, team: @team, actor: @owner, kind: "assigned", item: ticket, item_title: ticket.title, board_id: @board.id, occurred_at: Time.current) }

    get notifications_url, headers: @headers

    assert_equal({ "Backlog" => true, "Column" => false }, json["notifications"].to_h { |notification| [ notification["item_title"], notification["in_backlog"] ] })
  end

  test "index purges only notifications read more than 30 days ago" do
    old_read = notify(read_at: 31.days.ago)
    old_unread = notify(occurred_at: 40.days.ago)
    recent_read = notify(read_at: 29.days.ago)

    get notifications_url, headers: @headers

    assert_not Notification.exists?(old_read.id)
    assert Notification.exists?(old_unread.id)
    assert Notification.exists?(recent_read.id)
  end

  test "index runs the same number of queries for 1 and 10 notifications" do
    attach_avatar(@owner)
    notify(item: Ticket.create!(board: @board, team: @team, created_by_user_id: @owner.id, title: "Ticket", position: 0))
    one = query_count { get notifications_url, headers: @headers }

    9.times { notify(item: Ticket.create!(board: @board, team: @team, created_by_user_id: @owner.id, title: "Ticket", position: 0)) }
    ten = query_count { get notifications_url, headers: @headers }

    assert_equal one, ten
  end

  test "update toggles read and broadcasts the change" do
    notification = notify

    patch notifications_url(notification.id), params: { notification: { read: true } }, headers: @headers, as: :json

    assert_response :ok
    assert json["notification"]["read"]
    assert_equal 0, json["unread_count"]
    message = ::JSON.parse(broadcasts(NotificationChannel.stream_name(@user)).last)
    assert_equal [ "notifications_read", [ notification.id ], true, 0 ], message.values_at("type", "ids", "read", "unread_count")

    patch notifications_url(notification.id), params: { notification: { read: false } }, headers: @headers, as: :json
    assert_nil notification.reload.read_at
  end

  test "update returns NOTIFICATION_NOT_FOUND for other users' and hidden notifications" do
    other = notify(user: @owner)
    secret = Project.create!(team: @team, name: "Secret", owner: @owner, creator: @owner)
    hidden = notify(item: Page.create!(team: @team, creator: @owner, title: "Hidden", content: "", project: secret))

    [ other, hidden ].each do |notification|
      patch notifications_url(notification.id), params: { notification: { read: true } }, headers: @headers, as: :json

      assert_response :not_found
      assert_equal "NOTIFICATION_NOT_FOUND", json["code"]
    end
  end

  test "read_all only marks the current team's notifications" do
    other_team = Team.create!(name: "Other", password: "supersecret")
    Membership.create!(team: other_team, user: @user, nickname: "Bob")
    elsewhere = notify(team: other_team, item: Page.create!(team: other_team, creator: @user, title: "Theirs", content: ""))
    here = notify

    post notifications_url("read_all"), headers: @headers

    assert_response :ok
    assert_equal 0, json["unread_count"]
    assert here.reload.read_at
    assert_nil elsewhere.reload.read_at
  end

  test "unread_count counts visible unread notifications" do
    2.times { notify }
    notify(read_at: Time.current)

    get notifications_url("unread_count"), headers: @headers

    assert_equal 2, json["unread_count"]
  end
end
