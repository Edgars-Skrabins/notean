class Comment < ApplicationRecord
  include ContentLimits

  COMMENTABLE_TYPES = %w[Ticket Page DiagramCommentPin].freeze
  BODY_MAX_BYTES = 50_000

  belongs_to :team
  belongs_to :commentable, polymorphic: true
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id

  validates :commentable_type, inclusion: { in: COMMENTABLE_TYPES }
  validate :commentable_belongs_to_team
  validate :body_text_present
  validate :body_size

  before_update { self.edited_at = Time.current if body_changed? }

  private

  def commentable_belongs_to_team
    errors.add(:commentable, "must belong to the same team") if commentable && commentable.team_id != team_id
  end

  def body_text_present
    errors.add(:body, :blank) if SearchText.from_html(body).blank?
  end

  def body_size
    errors.add(:body, :too_long) if SearchText.from_html(body).length > DESCRIPTION_MAX_LENGTH || body.to_s.bytesize > BODY_MAX_BYTES
  end
end
