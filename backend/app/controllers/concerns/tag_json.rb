module TagJson
  extend ActiveSupport::Concern

  private

  def tags_json(board)
    counts = TicketTag.where(board_tag_id: board.tags.select(:id)).group(:board_tag_id).count
    board.tags.map { |tag| tag_json(tag, counts.fetch(tag.id, 0)) }
  end

  def tag_json(tag, ticket_count)
    {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      ticket_count: ticket_count
    }
  end
end
