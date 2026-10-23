module BoardScoped
  extend ActiveSupport::Concern

  private

  def set_board
    @board = project_access.scope(@team.boards).find_by(id: params[:board_id])

    render_error(ErrorCodes::Boards::BOARD_NOT_FOUND, :not_found) if @board.nil?
  end

  def find_assignable_user(user_id)
    user = @team.users.find_by(id: user_id)
    if user.nil?
      render_error(ErrorCodes::Tickets::ASSIGNEE_NOT_TEAM_MEMBER, :unprocessable_entity)
    elsif !ProjectAccess.users_who_can_see(@board).exists?(user.id)
      render_error(ErrorCodes::Tickets::ASSIGNEE_NO_ACCESS, :unprocessable_entity)
      return nil
    end
    user
  end
end
