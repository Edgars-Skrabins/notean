module ChatJson
  extend ActiveSupport::Concern

  MESSAGE_PRELOAD = [ { author: User::AVATAR_PRELOAD }, :chat_reactions ].freeze

  private

  def chat_channel_summary_json(channel, unread_count: nil, can_manage: nil)
    json = {
      id: channel.id,
      name: channel.name,
      scope: channel.scope,
      project_id: channel.project_id,
      gif_rating: channel.gif_rating,
      created_by_user_id: channel.created_by_user_id,
      last_message_at: channel.last_message_at,
      created_at: channel.created_at
    }
    json[:unread_count] = unread_count unless unread_count.nil?
    json[:can_manage] = can_manage unless can_manage.nil?
    json
  end

  def chat_channel_json(channel, unread_count:, can_manage:)
    chat_channel_summary_json(channel, unread_count: unread_count, can_manage: can_manage).merge(
      project: channel.project && { id: channel.project.id, name: channel.project.name },
      members: channel.scope == "users" ? channel.members.includes(User::AVATAR_PRELOAD).order(:id).map { |user| member_json(user) } : []
    )
  end

  def chat_message_json(message)
    {
      id: message.id,
      chat_channel_id: message.chat_channel_id,
      kind: message.kind,
      body: message.body,
      gif: message.gif,
      author: member_json(message.author),
      created_at: message.created_at,
      edited_at: message.edited_at,
      reactions: chat_reactions_json(message.chat_reactions)
    }
  end

  def chat_reactions_json(reactions)
    reactions.group_by(&:emoji).map { |emoji, grouped| { emoji: emoji, user_ids: grouped.map(&:user_id) } }
  end
end
