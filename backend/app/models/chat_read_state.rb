class ChatReadState < ApplicationRecord
  belongs_to :chat_channel
  belongs_to :user

  def self.advance(channel, user, message_id)
    now = Time.current
    upsert(
      { chat_channel_id: channel.id, user_id: user.id, last_read_message_id: message_id, created_at: now, updated_at: now },
      unique_by: [ :chat_channel_id, :user_id ],
      on_duplicate: Arel.sql("last_read_message_id = GREATEST(chat_read_states.last_read_message_id, EXCLUDED.last_read_message_id), updated_at = EXCLUDED.updated_at")
    )
  end
end
