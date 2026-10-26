module TicketJson
  extend ActiveSupport::Concern

  ASSIGNEES_PRELOAD = { ticket_assignees: { user: User::AVATAR_PRELOAD } }.freeze

  private

  def ticket_json(ticket)
    {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      board_id: ticket.board_id,
      column_id: ticket.column_id,
      position: ticket.position,
      priority_id: ticket.priority_id,
      lock_version: ticket.lock_version,
      creator: member_json(ticket.creator),
      assignees: assignees_json(ticket),
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
      priority_id: ticket.priority_id,
      lock_version: ticket.lock_version,
      assignees: assignees_json(ticket),
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    }
  end

  def ticket_broadcast_json(ticket)
    ticket_summary_json(ticket).merge(description: ticket.description)
  end

  def assignees_json(ticket)
    ticket.ticket_assignees.map { |assignee| member_json(assignee.user) }
  end
end
