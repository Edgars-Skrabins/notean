class BoardChannel < ApplicationCable::Channel
  def self.stream_name(board)
    "board:#{board.id}"
  end

  def subscribed
    board = Board.find_by(id: params[:board_id])

    if board && board.team.feature_enabled?(:boards) && current_user.memberships.exists?(team_id: board.team_id) && ProjectAccess.new(current_user, board.team).visible?(board)
      stream_from self.class.stream_name(board)
    else
      reject
    end
  end
end
