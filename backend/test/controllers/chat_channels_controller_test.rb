require "test_helper"

class ChatChannelsControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper

  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(user: @owner, team: @team, role: "owner", nickname: "Alice")
    @lead = create_member(@team, "Lena")
    @member = create_member(@team, "Bob")
    @game = Project.create!(team: @team, name: "Game", owner: @lead, creator: @owner)
    @game.project_members.create!(user: @member)
  end

  def headers(user = @owner)
    { "Authorization" => "Bearer #{session_token(user)}" }
  end

  def channels_url(*segments)
    [ "/teams/#{@team.code}/chat_channels", *segments ].join("/")
  end

  def create_channel(name, scope = "team", creator: @owner, **attributes)
    ChatChannel.create!(team: @team, creator: creator, name: name, scope: scope, **attributes)
  end

  def chat_broadcasts(user)
    broadcasts(ChatCable.stream_name(@team, user.id)).map { |message| ::JSON.parse(message) }
  end

  test "index lists visible channels with unread counts, ignoring the user's own messages" do
    general = create_channel("General")
    create_channel("Secret", "users")
    first = ChatMessage.create!(chat_channel: general, author: @owner, body: "Hi")
    ChatMessage.create!(chat_channel: general, author: @owner, body: "Again")
    ChatMessage.create!(chat_channel: general, author: @member, body: "Mine")
    ChatReadState.advance(general, @member, first.id)

    get channels_url, headers: headers(@member)

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal [ [ "General", 1, false ] ], body["chat_channels"].map { |channel| channel.values_at("name", "unread_count", "can_manage") }
    assert_equal [], body["creatable_scopes"]
  end

  test "index with a project lists that project's channels plus the projectless ones" do
    create_channel("General")
    create_channel("Game", "project", project: @game)
    other = Project.create!(team: @team, name: "Other", owner: @owner, creator: @owner)
    create_channel("Other", "project", project: other)

    get channels_url, params: { project_id: @game.id }, headers: headers

    assert_equal %w[General Game], JSON.parse(response.body)["chat_channels"].map { |channel| channel["name"] }
  end

  test "index query count does not grow with the number of channels" do
    create_channel("Channel 0", "project", project: @game)
    one = query_count { get channels_url, headers: headers(@lead) }
    1.upto(9) { |index| create_channel("Channel #{index}", "project", project: @game) }
    ten = query_count { get channels_url, headers: headers(@lead) }

    assert_equal one, ten
  end

  test "a project owner creates channels for their project only" do
    post channels_url, params: { chat_channel: { name: "Game chat", scope: "project", project_id: @game.id } }, headers: headers(@lead), as: :json
    assert_response :created
    assert_equal [ "project", @game.id, true ], JSON.parse(response.body)["chat_channel"].values_at("scope", "project_id", "can_manage")

    post channels_url, params: { chat_channel: { name: "Everyone", scope: "team" } }, headers: headers(@lead), as: :json
    assert_response :forbidden
  end

  test "members cannot create channels" do
    post channels_url, params: { chat_channel: { name: "Mine", scope: "users", member_ids: [ @owner.id ] } }, headers: headers(@member), as: :json

    assert_response :forbidden
  end

  test "creating a user-scoped channel adds the creator and broadcasts to its viewers only" do
    post channels_url, params: { chat_channel: { name: "Pair", scope: "users", member_ids: [ @member.id ] } }, headers: headers, as: :json

    assert_response :created
    channel = ChatChannel.find(JSON.parse(response.body)["chat_channel"]["id"])
    assert_equal [ @owner.id, @member.id ].sort, channel.members.pluck(:id).sort
    assert_equal [ "channel_upserted" ], chat_broadcasts(@member).map { |message| message["type"] }
    assert_empty chat_broadcasts(@lead)
  end

  test "create rejects a duplicate name and members outside the team" do
    create_channel("General")
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    post channels_url, params: { chat_channel: { name: "general", scope: "team" } }, headers: headers, as: :json
    assert_equal "CHAT_CHANNEL_NAME_TAKEN", JSON.parse(response.body)["code"]

    post channels_url, params: { chat_channel: { name: "Pair", scope: "users", member_ids: [ outsider.id ] } }, headers: headers, as: :json
    assert_equal "CHAT_CHANNEL_MEMBERS_INVALID", JSON.parse(response.body)["code"]
  end

  test "update renames, changes the rating and members, telling removed members" do
    channel = create_channel("Pair", "users", creator: @lead)
    channel.chat_channel_members.create!(user: @lead)
    channel.chat_channel_members.create!(user: @member)

    patch channels_url(channel.id), params: { chat_channel: { name: "Duo", gif_rating: "pg-13", member_ids: [ @lead.id ] } }, headers: headers(@lead), as: :json

    assert_response :success
    assert_equal [ "Duo", "pg-13" ], channel.reload.values_at(:name, :gif_rating)
    assert_equal [ @lead.id ], channel.members.pluck(:id)
    assert_equal [ "channel_removed" ], chat_broadcasts(@member).map { |message| message["type"] }
  end

  test "only people who may manage a channel update or delete it" do
    channel = create_channel("General")

    patch channels_url(channel.id), params: { chat_channel: { name: "Renamed" } }, headers: headers(@member), as: :json
    assert_response :forbidden

    delete channels_url(channel.id), headers: headers(@member)
    assert_response :forbidden
  end

  test "delete moves the channel to trash and tells its viewers" do
    channel = create_channel("General")

    delete channels_url(channel.id), headers: headers

    assert_response :no_content
    assert channel.reload.trashed?
    assert_equal [ "channel_removed" ], chat_broadcasts(@member).map { |message| message["type"] }

    get channels_url(channel.id), headers: headers
    assert_response :not_found
  end

  test "members can leave a user-scoped channel but never as its last member" do
    channel = create_channel("Pair", "users")
    channel.chat_channel_members.create!(user: @lead)
    channel.chat_channel_members.create!(user: @member)

    post channels_url(channel.id, "leave"), headers: headers(@member)
    assert_response :no_content

    post channels_url(channel.id, "leave"), headers: headers(@lead)
    assert_equal "CHAT_CHANNEL_LAST_MEMBER", JSON.parse(response.body)["code"]

    post channels_url(create_channel("General").id, "leave"), headers: headers(@member)
    assert_equal "CHAT_CHANNEL_NOT_LEAVABLE", JSON.parse(response.body)["code"]
  end

  test "read only moves the read state forward" do
    channel = create_channel("General")
    first = ChatMessage.create!(chat_channel: channel, author: @owner, body: "One")
    second = ChatMessage.create!(chat_channel: channel, author: @owner, body: "Two")

    post channels_url(channel.id, "read"), params: { last_read_message_id: second.id }, headers: headers(@member), as: :json
    post channels_url(channel.id, "read"), params: { last_read_message_id: first.id }, headers: headers(@member), as: :json

    assert_equal second.id, ChatReadState.find_by(chat_channel: channel, user: @member).last_read_message_id
  end

  test "channels are hidden from people outside their scope" do
    channel = create_channel("Pair", "users")

    get channels_url(channel.id), headers: headers(@member)

    assert_response :not_found
  end

  test "every chat endpoint is forbidden while chat is off" do
    @team.update!(chat_enabled: false)

    get channels_url, headers: headers

    assert_response :forbidden
    assert_equal "FEATURE_DISABLED", JSON.parse(response.body)["code"]
  end
end
