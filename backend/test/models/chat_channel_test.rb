require "test_helper"

class ChatChannelTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = create_member(@team, "Alice")
  end

  def create_channel(name, **attributes)
    ChatChannel.create!(team: @team, creator: @owner, name: name, scope: "team", **attributes)
  end

  test "names are unique per team ignoring case and surrounding spaces" do
    create_channel("General")
    other_team = Team.create!(name: "Design", password: "supersecret")

    duplicate = ChatChannel.new(team: @team, creator: @owner, name: "  general ", scope: "team")
    assert_not duplicate.valid?
    assert duplicate.errors.of_kind?(:name, :taken)
    assert ChatChannel.new(team: other_team, creator: @owner, name: "General", scope: "team").valid?
  end

  test "a trashed channel still reserves its name" do
    channel = create_channel("General")
    Trash.move(channel, @owner)

    assert_not ChatChannel.new(team: @team, creator: @owner, name: "general", scope: "team").valid?
  end

  test "only project channels have a project" do
    project = Project.create!(team: @team, name: "Game", owner: @owner, creator: @owner)

    assert_not ChatChannel.new(team: @team, creator: @owner, name: "A", scope: "project").valid?
    assert_not ChatChannel.new(team: @team, creator: @owner, name: "B", scope: "team", project: project).valid?
    assert ChatChannel.new(team: @team, creator: @owner, name: "C", scope: "project", project: project).valid?
  end

  test "messages are limited to 4000 characters and text messages need text" do
    channel = create_channel("General")

    assert_not ChatMessage.new(chat_channel: channel, author: @owner, body: "   ").valid?
    assert_not ChatMessage.new(chat_channel: channel, author: @owner, body: "a" * 4_001).valid?
    assert ChatMessage.new(chat_channel: channel, author: @owner, body: "a" * 4_000).valid?
    assert ChatMessage.new(chat_channel: channel, author: @owner, kind: "gif", gif: { "id" => "x" }).valid?
  end

  test "reactions accept exactly one emoji" do
    assert ChatReaction.valid_emoji?("👍")
    assert ChatReaction.valid_emoji?("👍🏽")
    assert ChatReaction.valid_emoji?("👩‍💻")
    assert ChatReaction.valid_emoji?("🇱🇻")
    assert_not ChatReaction.valid_emoji?("👍👍")
    assert_not ChatReaction.valid_emoji?("a")
    assert_not ChatReaction.valid_emoji?("")
  end

  test "read state only moves forward" do
    channel = create_channel("General")

    ChatReadState.advance(channel, @owner, 10)
    ChatReadState.advance(channel, @owner, 4)

    assert_equal 10, ChatReadState.find_by(chat_channel: channel, user: @owner).last_read_message_id
  end
end
