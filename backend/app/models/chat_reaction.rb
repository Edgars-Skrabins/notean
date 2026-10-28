class ChatReaction < ApplicationRecord
  MAX_DISTINCT = 20
  EMOJI_PATTERN = /\A(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2}\z|[0-9#*]\u{FE0F}?\u{20E3}\z)/

  belongs_to :chat_message
  belongs_to :user

  validate :single_emoji

  def self.valid_emoji?(emoji)
    graphemes = emoji.to_s.grapheme_clusters
    graphemes.length == 1 && graphemes.first.match?(EMOJI_PATTERN)
  end

  private

  def single_emoji
    errors.add(:emoji, :invalid) unless self.class.valid_emoji?(emoji)
  end
end
