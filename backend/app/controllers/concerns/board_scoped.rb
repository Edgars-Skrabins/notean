module BoardScoped
  extend ActiveSupport::Concern

  private

  def set_board
    @board = @team.boards.find_by(id: params[:board_id])

    render_error(ErrorCodes::Boards::BOARD_NOT_FOUND, :not_found) if @board.nil?
  end
end
