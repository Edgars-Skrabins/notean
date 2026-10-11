class TicketAssignee < ApplicationRecord
  belongs_to :ticket, touch: true
  belongs_to :user

  validates :user_id, uniqueness: { scope: :ticket_id }
  validate :user_is_team_member

  private

  def user_is_team_member
    return unless ticket && user

    errors.add(:user, "must be a member of the ticket's team") unless user.memberships.exists?(team_id: ticket.team_id)
  end
end
