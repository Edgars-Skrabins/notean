class ProjectAccessCleanup
  def self.for_project(project)
    Board.unscoped.where(project_id: project.id).find_each { |board| for_board(board) }
  end

  def self.for_board(board)
    allowed_user_ids = ProjectAccess.users_who_can_see(board).select(:id)
    TicketAssignee.where(ticket: Ticket.unscoped.where(board_id: board.id)).where.not(user_id: allowed_user_ids).destroy_all
  end
end
