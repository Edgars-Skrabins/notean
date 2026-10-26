class ApplicationController < ActionController::API
  DEFAULT_TITLE = "Untitled"

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

  def update_team_features_params
    params.require(:team).permit(:pages_enabled, :diagrams_enabled, :boards_enabled)
  end

  def update_membership_params
    params.require(:membership).permit(:nickname)
  end

  def update_member_role_params
    params.require(:membership).permit(:role)
  end

  def transfer_ownership_params
    params.require(:membership).permit(:user_id)
  end

  def user_params
    params.require(:user).permit(:email, :password)
  end

  def create_page_params
    params.fetch(:page, {}).permit(:title, :content, :folder_id, :project_id)
  end

  def update_page_params
    params.require(:page).permit(:title, :content, :folder_id, :project_id, :lock_version)
  end

  def create_diagram_params
    params.fetch(:diagram, {}).permit(:title, :content, :folder_id, :project_id)
  end

  def update_diagram_params
    params.require(:diagram).permit(:title, :content, :folder_id, :project_id, :lock_version)
  end

  def create_folder_params
    params.require(:folder).permit(:title, :item_type, :parent_id, :project_id)
  end

  def update_folder_params
    params.require(:folder).permit(:title, :parent_id, :project_id)
  end

  def create_board_params
    params.fetch(:board, {}).permit(:title, :project_id)
  end

  def update_board_params
    params.require(:board).permit(:title, :project_id)
  end

  def create_column_params
    params.fetch(:column, {}).permit(:title)
  end

  def update_column_params
    params.require(:column).permit(:title)
  end

  def create_priority_params
    params.require(:priority).permit(:name, :color)
  end

  def update_priority_params
    params.require(:priority).permit(:name, :color, :position)
  end

  def create_ticket_params
    params.fetch(:ticket, {}).permit(:title, :column_id)
  end

  def update_ticket_params
    params.require(:ticket).permit(:title, :description, :column_id, :position, :to_backlog, :priority_id, :lock_version)
  end

  def bulk_ticket_params
    params.require(:bulk).permit(:column_id, :to_backlog, :add_assignee_id, :remove_assignee_id, ticket_ids: [])
  end

  def create_assignee_params
    params.require(:assignee).permit(:user_id)
  end

  def project_params
    params.require(:project).permit(:name, :description, :owner_user_id, member_ids: [])
  end

  def destroy_project_params
    params.require(:project).permit(:mode, :confirm_name)
  end

  def create_favorite_params
    params.require(:favorite).permit(:favoritable_type, :favoritable_id)
  end

  def update_favorite_params
    params.require(:favorite).permit(:surface, :position)
  end

  def update_settings_params
    params.require(:settings).permit(:show_favorites_on_home, :show_favorites_in_sidebar, :show_my_work_on_home, :theme, :theme_mode)
  end

  def update_avatar_params
    params.require(:avatar).permit(:color, :image, :remove_image)
  end

  def insert_and_reindex(siblings, record, requested_position, attribute)
    insert_at = requested_position.nil? ? siblings.length : requested_position.to_i.clamp(0, siblings.length)
    siblings.insert(insert_at, record).each_with_index do |sibling, index|
      sibling.update_column(attribute, index) unless sibling == record
    end
    insert_at
  end

  def project_access
    @project_access ||= ProjectAccess.new(current_user, @team)
  end

  def project_filtered(relation)
    project_id = params[:project_id]
    if project_id.present? && !project_access.project_visible?(project_id)
      render_error(ErrorCodes::Projects::PROJECT_NOT_FOUND, :not_found)
      return nil
    end

    project_access.filter(relation, project_id)
  end

  def assign_project(record, project_id)
    if project_id.present? && !project_access.project_visible?(project_id)
      render_error(ErrorCodes::Projects::PROJECT_INVALID, :unprocessable_entity)
      return false
    end

    record.project_id = project_id.presence
    true
  end

  def visible_folder(folder_id)
    project_access.scope(@team.folders).find_by(id: folder_id)
  end

  def place_in_folder(record, record_params, folder_key)
    association = folder_key.to_s.delete_suffix("_id")

    if record_params[folder_key].present?
      folder = visible_folder(record_params[folder_key])
      if folder.nil?
        render_error(ErrorCodes::Folders::FOLDER_NOT_FOUND, :not_found)
        return false
      end

      record.public_send("#{association}=", folder)
      record.project_id = folder.project_id
      return true
    end

    record.public_send("#{association}=", nil) if record_params.key?(folder_key)
    return true unless record.new_record? || record_params.key?(:project_id)

    if record.public_send(folder_key).present?
      render_error(ErrorCodes::Projects::PROJECT_SET_BY_FOLDER, :unprocessable_entity)
      return false
    end

    assign_project(record, record_params[:project_id])
  end

  def assign_lock_version(record, record_params, *checked_keys)
    return true unless checked_keys.any? { |key| record_params.key?(key) }

    if record_params[:lock_version].blank?
      render_error(ErrorCodes::Common::LOCK_VERSION_REQUIRED, :unprocessable_entity)
      return false
    end

    record.lock_version = record_params[:lock_version]
    true
  end

  def render_error(code, status, extra: {})
    render json: { code: code }.merge(extra), status: status
  end

  def limit_error_code(record)
    if record.errors.of_kind?(:title, :too_long) || record.errors.of_kind?(:name, :too_long)
      ErrorCodes::Common::TITLE_TOO_LONG
    elsif record.errors.of_kind?(:content, :too_large)
      ErrorCodes::Common::CONTENT_TOO_LARGE
    elsif record.errors.of_kind?(:description, :too_long)
      ErrorCodes::Common::DESCRIPTION_TOO_LONG
    end
  end

  def set_team
    @team = Team.find_by(code: team_code)

    render_error(ErrorCodes::Teams::TEAM_NOT_FOUND, :not_found) if @team.nil?
  end

  def team_code
    params[:team_code]
  end

  def authorize_team_member!
    render_error(ErrorCodes::Teams::NOT_TEAM_MEMBER, :forbidden) unless current_user.memberships.exists?(team: @team)
  end

  def authenticate_user!
    render_error(ErrorCodes::Common::UNAUTHORIZED, :unauthorized) unless current_user
  end

  def active_membership(user)
    user.memberships.includes(:team).order(last_active_at: :desc).first
  end

  def membership_for(team)
    team.memberships.find_by(user: current_user)
  end

  def require_team_role!(team, *roles)
    membership = membership_for(team)
    unless membership && roles.map(&:to_s).include?(membership.role)
      render_error(ErrorCodes::Common::FORBIDDEN, :forbidden)
      return nil
    end
    membership
  end

  def title_or_default(title)
    title.presence || DEFAULT_TITLE
  end

  def team_json(team)
    team.as_json(except: [ :password, :password_digest ])
  end

  def members_json(team)
    team.memberships.includes(user: User::AVATAR_PRELOAD).map { |m| member_json(m.user).merge(role: m.role) }
  end

  def member_json(user)
    { id: user.id, nickname: team_nicknames[user.id], avatar: avatar_json(user) }
  end

  def avatar_json(user)
    {
      color: user.effective_avatar_color,
      image_url: user.avatar_image.attached? ? rails_blob_path(user.avatar_image, only_path: true) : nil
    }
  end

  def team_nicknames
    @team_nicknames ||= @team.all_memberships.pluck(:user_id, :nickname).to_h
  end

  def render_nickname_error(membership)
    if membership.errors.of_kind?(:nickname, :taken)
      render_error(ErrorCodes::Teams::NICKNAME_TAKEN, :conflict)
    else
      render_error(ErrorCodes::Teams::NICKNAME_INVALID, :unprocessable_entity)
    end
  end

  def current_user
    return @current_user if defined?(@current_user)

    header = request.headers["Authorization"]
    token = header.split(" ").last if header

    @current_user = token && User.active.find_by(id: JsonWebToken.decode(token)[:user_id])
  rescue JWT::DecodeError
    @current_user = nil
  end
end
