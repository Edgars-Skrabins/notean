class BoardBroadcast
  def self.tickets_upserted(board, tickets)
    broadcast(board, type: "tickets_upserted", tickets: tickets)
  end

  def self.tickets_removed(board, ticket_ids)
    broadcast(board, type: "tickets_removed", ticket_ids: ticket_ids)
  end

  def self.tickets_shifted(board, shifts)
    broadcast(board, type: "tickets_shifted", shifts: shifts)
  end

  def self.columns_changed(board, columns, tickets: nil)
    broadcast(board, { type: "columns_changed", columns: columns, tickets: tickets }.compact)
  end

  def self.priorities_changed(board, priorities, tickets: nil)
    broadcast(board, { type: "priorities_changed", priorities: priorities, tickets: tickets }.compact)
  end

  def self.tags_changed(board, tags, tickets: nil)
    broadcast(board, { type: "tags_changed", tags: tags, tickets: tickets }.compact)
  end

  def self.board_updated(board)
    broadcast(board, type: "board_updated", board: { id: board.id, title: board.title, project_id: board.project_id })
  end

  def self.board_deleted(board)
    broadcast(board, type: "board_deleted")
  end

  def self.access_changed(board)
    broadcast(board, type: "access_changed")
  end

  def self.broadcast(board, payload)
    ActionCable.server.broadcast(BoardChannel.stream_name(board), payload)
  end
  private_class_method :broadcast
end
