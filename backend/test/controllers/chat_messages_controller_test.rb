require "test_helper"

class ChatMessagesControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper

  GIF = { id: "abc123", url: "https://media1.giphy.com/media/abc123/200.gif", width: 200, height: 150, title: "Cat" }.freeze

  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @owner, team: @team, role: "owner", nickname: "Alice")
    @member = create_member(@team, "Bob")
    @outsider = create_member(@team, "Carol")
    @channel = ChatChannel.create!(team: @team, creator: @owner, name: "Pair", scope: "users")
    @channel.chat_channel_members.create!(user: @owner)
    @channel.chat_channel_members.create!(user: @member)
  end

  def headers(user = @owner)
    { "Authorization" => "Bearer #{session_token(user)}" }
  end

  def messages_url(*segments)
    [ "/teams/#{@team.code}/chat_channels/#{@channel.id}/messages", *segments ].join("/")
  end

  def chat_message(body = "Hello", author: @owner)
    ChatMessage.create!(chat_channel: @channel, author: author, body: body)
  end

  def chat_broadcasts(user)
    broadcasts(ChatCable.stream_name(@team, user.id)).map { |payload| ::JSON.parse(payload) }
  end

  test "index returns the newest page oldest first and pages back with before" do
    messages = 52.times.map { |index| chat_message("Message #{index}") }

    get messages_url, headers: headers
    first_page = JSON.parse(response.body)
    assert_equal messages.last(50).map(&:id), first_page["messages"].map { |json| json["id"] }
    assert first_page["has_more"]

    get messages_url, params: { before: messages[2].id }, headers: headers
    second_page = JSON.parse(response.body)
    assert_equal messages.first(2).map(&:id), second_page["messages"].map { |json| json["id"] }
    assert_not second_page["has_more"]
  end

  test "index around a message returns its neighbours" do
    messages = 60.times.map { |index| chat_message("Message #{index}") }

    get messages_url, params: { around: messages[30].id }, headers: headers

    body = JSON.parse(response.body)
    assert_equal messages[5...55].map(&:id), body["messages"].map { |json| json["id"] }
    assert body["has_more_before"]
    assert body["has_more_after"]
  end

  test "index query count does not grow with the number of messages" do
    chat_message("One").chat_reactions.create!(user: @member, emoji: "👍")
    one = query_count { get messages_url, headers: headers }
    9.times { |index| chat_message("More #{index}", author: @member).chat_reactions.create!(user: @owner, emoji: "🎉") }
    ten = query_count { get messages_url, headers: headers }

    assert_equal one, ten
  end

  test "create saves the message, marks it read for the author and broadcasts it to viewers" do
    post messages_url, params: { message: { body: "  Hi there  " } }, headers: headers, as: :json

    assert_response :created
    json = JSON.parse(response.body)["message"]
    assert_equal [ "Hi there", "text", "Alice" ], [ json["body"], json["kind"], json["author"]["nickname"] ]
    assert_equal json["id"], ChatReadState.find_by(chat_channel: @channel, user: @owner).last_read_message_id
    assert_not_nil @channel.reload.last_message_at
    assert_equal [ "message_created" ], chat_broadcasts(@member).map { |payload| payload["type"] }
    assert_empty chat_broadcasts(@outsider)
  end

  test "create rejects empty and too long messages" do
    post messages_url, params: { message: { body: "   " } }, headers: headers, as: :json
    assert_equal "MESSAGE_EMPTY", JSON.parse(response.body)["code"]

    post messages_url, params: { message: { body: "a" * 4_001 } }, headers: headers, as: :json
    assert_equal "MESSAGE_TOO_LONG", JSON.parse(response.body)["code"]
  end

  test "mentions notify only users who can see the channel and item labels are stripped" do
    page = Page.create!(team: @team, creator: @owner, title: "Spec", content: "")
    body = "Hey @[user:#{@member.id}|Bob] and @[user:#{@outsider.id}|Carol], see @[page:#{page.id}|Spec]"

    post messages_url, params: { message: { body: body } }, headers: headers, as: :json

    assert_includes JSON.parse(response.body)["message"]["body"], "@[page:#{page.id}]"
    notification = Notification.find_by!(user: @member)
    assert_equal [ "mentioned", "ChatMessage", @channel.id, "Pair" ], notification.values_at(:kind, :item_type, :chat_channel_id, :item_title)
    assert_not Notification.exists?(user: @outsider)
    assert_equal 1, Notification.for(@member, @team).visible_to(ProjectAccess.new(@member, @team), @team).count
  end

  test "only the author edits a text message" do
    own = chat_message("Hello")

    patch messages_url(own.id), params: { message: { body: "Hello!" } }, headers: headers(@member), as: :json
    assert_response :forbidden

    patch messages_url(own.id), params: { message: { body: "Hello!" } }, headers: headers, as: :json
    assert_response :success
    assert_not_nil own.reload.edited_at
    assert_equal [ "message_updated" ], chat_broadcasts(@member).map { |payload| payload["type"] }
  end

  test "the author and team managers delete messages, removing their notifications" do
    own = chat_message("Hi @[user:#{@owner.id}|Alice]", author: @member)
    MentionNotifications.call(item: own, before: "", after: own.body, actor: @member, html: false)

    delete messages_url(chat_message("Other").id), headers: headers(@member)
    assert_response :forbidden

    delete messages_url(own.id), headers: headers
    assert_response :no_content
    assert_not ChatMessage.exists?(own.id)
    assert_not Notification.exists?(item_type: "ChatMessage", item_id: own.id)
  end

  test "gif messages store the resolved gif with the channel's rating" do
    calls = []
    find = ->(id, rating:) { calls << [ id, rating ]; GIF }

    GiphyClient.stub :find, find do
      post messages_url, params: { message: { gif_id: "abc123" } }, headers: headers, as: :json
    end

    assert_response :created
    json = JSON.parse(response.body)["message"]
    assert_equal [ "gif", "", GIF[:url] ], [ json["kind"], json["body"], json["gif"]["url"] ]
    assert_equal [ [ "abc123", "pg" ] ], calls
  end

  test "an unknown gif and a missing giphy key are reported" do
    GiphyClient.stub :find, nil do
      post messages_url, params: { message: { gif_id: "nope" } }, headers: headers, as: :json
    end
    assert_equal "GIF_NOT_FOUND", JSON.parse(response.body)["code"]

    post messages_url, params: { message: { gif_id: "abc123" } }, headers: headers, as: :json
    assert_response :service_unavailable
    assert_equal "GIFS_UNAVAILABLE", JSON.parse(response.body)["code"]
  end

  test "gif search uses the channel's rating and reports a missing key" do
    @channel.update!(gif_rating: "pg-13")
    search = ->(query, rating:, offset:) { { gifs: [ GIF.merge(title: "#{query} #{rating} #{offset}") ], has_more: false } }

    GiphyClient.stub :search, search do
      get "/teams/#{@team.code}/chat_channels/#{@channel.id}/gifs", params: { q: "cats", offset: 24 }, headers: headers
    end
    assert_equal "cats pg-13 24", JSON.parse(response.body)["gifs"].first["title"]

    get "/teams/#{@team.code}/chat_channels/#{@channel.id}/gifs", params: { q: "cats" }, headers: headers
    assert_equal "GIFS_UNAVAILABLE", JSON.parse(response.body)["code"]
  end

  test "reactions toggle per user and emoji and are capped at twenty distinct emoji" do
    target = chat_message
    reactions_url = messages_url(target.id, "reactions")

    post reactions_url, params: { reaction: { emoji: "👍" } }, headers: headers(@member), as: :json
    post reactions_url, params: { reaction: { emoji: "👍" } }, headers: headers, as: :json
    assert_equal [ { "emoji" => "👍", "user_ids" => [ @member.id, @owner.id ] } ], JSON.parse(response.body)["reactions"]

    delete reactions_url, params: { reaction: { emoji: "👍" } }, headers: headers(@member), as: :json
    assert_equal [ @owner.id ], JSON.parse(response.body)["reactions"].first["user_ids"]

    post reactions_url, params: { reaction: { emoji: "not emoji" } }, headers: headers, as: :json
    assert_equal "CHAT_REACTION_INVALID", JSON.parse(response.body)["code"]

    %w[😀 😁 😂 🤣 😃 😄 😅 😆 😉 😊 😋 😎 😍 😘 🥰 😗 😙 😚 🙂].each { |emoji| target.chat_reactions.create!(user: @owner, emoji: emoji) }
    post reactions_url, params: { reaction: { emoji: "🤔" } }, headers: headers, as: :json
    assert_equal "CHAT_REACTION_LIMIT", JSON.parse(response.body)["code"]

    post reactions_url, params: { reaction: { emoji: "😀" } }, headers: headers(@member), as: :json
    assert_response :success
    assert_equal "reactions_changed", chat_broadcasts(@member).last["type"]
  end

  test "people outside a user-scoped channel cannot read it" do
    get messages_url, headers: headers(@outsider)

    assert_response :not_found
  end
end
