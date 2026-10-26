class TicketPositions
  def self.shift(board, column_id, from:, to: nil, delta:)
    return [] if to && to < from

    group(board, column_id).where(position: from..to).update_all([ "position = position + ?", delta ])
    [ { column_id: column_id, from_position: from, to_position: to, delta: delta } ]
  end

  def self.close_gaps(board, column_id, removed_positions)
    numbered = group(board, column_id).select(:id, Arel.sql("ROW_NUMBER() OVER (ORDER BY position, id) - 1 AS new_position"))
    Ticket.connection.exec_update(<<~SQL.squish)
      UPDATE tickets SET position = numbered.new_position
      FROM (#{numbered.to_sql}) AS numbered
      WHERE tickets.id = numbered.id AND tickets.position <> numbered.new_position
    SQL

    gap_ranges(column_id, removed_positions.sort)
  end

  def self.append(board, column_id, ticket_ids)
    start = group(board, column_id).where.not(id: ticket_ids).select(Arel.sql("COALESCE(MAX(position), -1) + 1"))
    board.tickets.where(id: ticket_ids).update_all([
      "column_id = ?, position = (#{start.to_sql}) + array_position(ARRAY[?]::bigint[], id) - 1, updated_at = ?",
      column_id, ticket_ids, Time.current
    ])
    []
  end

  def self.group(board, column_id)
    board.tickets.where(column_id: column_id)
  end

  def self.gap_ranges(column_id, positions)
    positions.each_with_index.filter_map do |position, index|
      to = positions[index + 1]&.pred
      next if to && to < position + 1

      { column_id: column_id, from_position: position + 1, to_position: to, delta: -(index + 1) }
    end
  end
  private_class_method :group, :gap_ranges
end
