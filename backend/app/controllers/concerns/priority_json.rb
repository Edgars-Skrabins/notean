module PriorityJson
  extend ActiveSupport::Concern

  private

  def priorities_json(board)
    counts = board.tickets.where.not(priority_id: nil).group(:priority_id).count
    board.priorities.map { |priority| priority_json(priority, counts.fetch(priority.id, 0)) }
  end

  def priority_json(priority, ticket_count)
    {
      id: priority.id,
      name: priority.name,
      color: priority.color,
      position: priority.position,
      ticket_count: ticket_count
    }
  end
end
