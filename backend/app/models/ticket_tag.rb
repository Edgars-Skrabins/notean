class TicketTag < ApplicationRecord
  belongs_to :ticket
  belongs_to :tag, class_name: "BoardTag", foreign_key: :board_tag_id

  validates :board_tag_id, uniqueness: { scope: :ticket_id }
  validate :tag_belongs_to_board
  validate :ticket_limit, on: :create

  after_create :refresh_ticket
  after_destroy :refresh_ticket, unless: :destroyed_by_association

  private

  def tag_belongs_to_board
    errors.add(:tag, "must belong to the ticket's board") if ticket && tag && tag.board_id != ticket.board_id
  end

  def ticket_limit
    errors.add(:ticket, :limit_reached) if ticket && ticket.ticket_tags.count >= Ticket::MAX_TAGS
  end

  def refresh_ticket
    Ticket.refresh_updated_at(ticket_id)
  end
end
