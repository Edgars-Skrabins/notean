class ApplicationController < ActionController::API
  private
  def team_params
    params.require(:team).permit(:code, :password, :nickname)
  end

  def create_team_params
    params.require(:team).permit(:name, :password, :nickname)
  end

  def update_team_params
    params.require(:team).permit(:name)
  end

  def update_membership_params
    params.require(:membership).permit(:nickname)
  end

  def user_params
    params.require(:user).permit(:email, :password)
  end

  def create_page_params
    params.fetch(:page, {}).permit(:title)
  end

  def update_page_params
    params.require(:page).permit(:title, :content, :folder_id)
  end

  def create_diagram_params
    params.fetch(:diagram, {}).permit(:title)
  end

  def update_diagram_params
    params.require(:diagram).permit(:title, :content, :folder_id)
  end

  def create_folder_params
    params.require(:folder).permit(:title, :item_type, :parent_id)
  end

  def update_folder_params
    params.require(:folder).permit(:title, :parent_id)
  end

  def create_board_params
    params.fetch(:board, {}).permit(:title)
  end

  def update_board_params
    params.require(:board).permit(:title)
  end

  def create_column_params
    params.fetch(:column, {}).permit(:title)
  end

  def update_column_params
    params.require(:column).permit(:title)
  end

  def create_card_params
    params.fetch(:card, {}).permit(:title, :column_id)
  end

  def update_card_params
    params.require(:card).permit(:title, :description, :column_id, :position)
  end

  def create_favorite_params
    params.require(:favorite).permit(:favoritable_type, :favoritable_id)
  end

  def update_favorite_params
    params.require(:favorite).permit(:surface, :position)
  end

  def update_settings_params
    params.require(:settings).permit(:show_favorites_on_home, :show_favorites_in_sidebar)
  end

  def authenticate_user!
    render json: { statusMessage: 'Unauthorized' }, status: :unauthorized unless current_user
  end

  def membership_for(team)
    team.memberships.find_by(user: current_user)
  end

  def require_team_role!(team, *roles)
    membership = membership_for(team)
    unless membership && roles.map(&:to_s).include?(membership.role)
      render json: { statusMessage: 'Forbidden' }, status: :forbidden
      return nil
    end
    membership
  end

  def team_nicknames
    @team_nicknames ||= @team.memberships.pluck(:user_id, :nickname).to_h
  end

  def render_nickname_error(membership)
    if membership.errors.of_kind?(:nickname, :taken)
      render json: { statusMessage: 'Nickname already taken in this team' }, status: :conflict
    else
      render json: { statusMessage: 'Invalid nickname' }, status: :unprocessable_entity
    end
  end

  def current_user
    return @current_user if defined?(@current_user)

    header = request.headers['Authorization']
    token = header.split(' ').last if header

    @current_user = token && User.find_by(id: JsonWebToken.decode(token)[:user_id])
  rescue JWT::DecodeError
    @current_user = nil
  end
end

