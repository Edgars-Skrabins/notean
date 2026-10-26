class TicketAssignee < ApplicationRecord
  belongs_to :ticket
  belongs_to :user

  validates :user_id, uniqueness: { scope: :ticket_id }
  validate :user_is_team_member

  after_create :refresh_ticket
  after_destroy :refresh_ticket, unless: :destroyed_by_association

  private

  def user_is_team_member
    return unless ticket && user

    errors.add(:user, "must be a member of the ticket's team") unless user.memberships.exists?(team_id: ticket.team_id)
  end

  def refresh_ticket
    Ticket.refresh_updated_at(ticket_id)
  end
end
