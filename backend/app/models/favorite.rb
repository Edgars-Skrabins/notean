class Favorite < ApplicationRecord
  FAVORITABLE_TYPES = %w[Page Diagram Board Ticket].freeze

  belongs_to :user
  belongs_to :team
  belongs_to :favoritable, polymorphic: true

  validates :favoritable_type, inclusion: { in: FAVORITABLE_TYPES }
  validates :home_position, presence: true
  validates :sidebar_position, presence: true
  validates :favoritable_id, uniqueness: { scope: [ :user_id, :favoritable_type ] }
  validate :favoritable_belongs_to_team

  private

  def favoritable_belongs_to_team
    errors.add(:favoritable, "must belong to the same team") if favoritable && favoritable.team_id != team_id
  end
end
