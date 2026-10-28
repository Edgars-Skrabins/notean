class ChatMessage < ApplicationRecord
  include ContentLimits

  KINDS = %w[text gif].freeze

  belongs_to :chat_channel
  belongs_to :author, class_name: "User", foreign_key: :user_id
  has_many :chat_reactions, -> { order(:created_at, :id) }, dependent: :delete_all

  validates :kind, inclusion: { in: KINDS }
  validates :body, length: { maximum: MESSAGE_MAX_LENGTH }
  validates :body, presence: true, if: -> { kind == "text" }
  validates :gif, presence: true, if: -> { kind == "gif" }

  delegate :team, :team_id, :project_id, to: :chat_channel

  before_validation { self.body = body.to_s.strip }

  def title
    chat_channel.name
  end
end
