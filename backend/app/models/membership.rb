class Membership < ApplicationRecord
  belongs_to :user
  belongs_to :team

  NICKNAME_FORMAT = /\A[a-zA-Z]+\z/
  NICKNAME_LENGTH = 3..30

  enum :role, { user: "user", admin: "admin", owner: "owner" }, default: "user"

  validates :role, presence: true
  validates :nickname, presence: true, length: { in: NICKNAME_LENGTH }, format: { with: NICKNAME_FORMAT }, uniqueness: { scope: :team_id }

  before_validation { self.last_active_at ||= Time.current }
  before_validation { self.nickname = nickname&.strip }

  scope :active, -> { where(removed_at: nil) }
  scope :removed, -> { where.not(removed_at: nil) }

  def removed?
    removed_at.present?
  end

  def remove!
    MembershipRemoval.apply(self)
  end

  def restore!(nickname:)
    update!(removed_at: nil, role: "user", nickname: nickname, last_active_at: Time.current)
  end
end
