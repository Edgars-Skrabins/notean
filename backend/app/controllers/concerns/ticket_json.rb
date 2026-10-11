module TicketJson
  extend ActiveSupport::Concern

  private

  def ticket_json(ticket)
    {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      board_id: ticket.board_id,
      column_id: ticket.column_id,
      position: ticket.position,
      creator: member_json(ticket.creator),
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    }
  end

  def ticket_summary_json(ticket)
    {
      id: ticket.id,
      title: ticket.title,
      position: ticket.position,
      column_id: ticket.column_id,
      updated_at: ticket.updated_at
    }
  end
end
