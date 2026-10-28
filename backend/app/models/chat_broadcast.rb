class ChatBroadcast
  include Rails.application.routes.url_helpers
  include MemberJson
  include ChatJson

  def self.message_created(message)
    new(message.team).message_event("message_created", message)
  end

  def self.message_updated(message)
    new(message.team).message_event("message_updated", message)
  end

  def self.message_deleted(channel, message_id)
    new(channel.team).to_viewers(channel, type: "message_deleted", chat_channel_id: channel.id, message_id: message_id)
  end

  def self.reactions_changed(message, reactions)
    new(message.team).to_viewers(message.chat_channel, type: "reactions_changed", chat_channel_id: message.chat_channel_id, message_id: message.id, reactions: reactions)
  end

  def self.channel_upserted(channel)
    new(channel.team).channel_event(channel)
  end

  def self.channel_removed(channel, user_ids)
    new(channel.team).to_users(user_ids, type: "channel_removed", chat_channel_id: channel.id)
  end

  def self.channels_changed(team, user_ids = team.users.pluck(:id))
    new(team).to_users(user_ids, type: "channels_changed")
  end

  def self.typing(channel, user)
    new(channel.team).typing_event(channel, user)
  end

  def initialize(team)
    @team = team
  end

  def message_event(type, message)
    to_viewers(message.chat_channel, type: type, chat_channel_id: message.chat_channel_id, message: chat_message_json(message))
  end

  def channel_event(channel)
    to_viewers(channel, type: "channel_upserted", chat_channel: chat_channel_summary_json(channel))
  end

  def typing_event(channel, user)
    to_users(ChatAccess.user_ids_who_can_see(channel) - [ user.id ], type: "typing", chat_channel_id: channel.id, user: member_json(user))
  end

  def to_viewers(channel, payload)
    to_users(ChatAccess.user_ids_who_can_see(channel), payload)
  end

  def to_users(user_ids, payload)
    user_ids.each { |user_id| ActionCable.server.broadcast(ChatCable.stream_name(@team, user_id), payload) }
  end
end
