class ProjectsController < ApplicationController
  DELETE_MODES = %w[keep delete_items].freeze

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_project, only: [ :show, :update, :destroy ]
  before_action :authorize_project_management!, only: [ :update, :destroy ]

  def index
    projects = visible_projects.includes(:project_members, owner: User::AVATAR_PRELOAD).order(Arel.sql("LOWER(name)"), :id)
    projects = projects.text_search(params[:search]) if params[:search].present?
    projects, has_more = paginate(projects)

    render json: { projects: projects.map { |project| project_summary_json(project) }, has_more: has_more }
  end

  def options
    projects = visible_projects.order(Arel.sql("LOWER(name)"), :id).select(:id, :name)

    render json: { projects: projects.map { |project| { id: project.id, name: project.name } } }
  end

  def show
    render json: { project: project_json(@project) }
  end

  def create
    return unless require_team_role!(@team, :admin, :owner)

    save_project(@team.projects.new(creator: current_user, owner: current_user), :created)
  end

  def update
    save_project(@project, :ok)
  end

  def destroy
    mode = destroy_project_params[:mode]
    return render_error(ErrorCodes::Projects::PROJECT_DELETE_MODE_INVALID, :unprocessable_entity) unless DELETE_MODES.include?(mode)
    return render_error(ErrorCodes::Projects::PROJECT_NAME_MISMATCH, :unprocessable_entity) unless destroy_project_params[:confirm_name] == @project.name

    Project.transaction do
      chat_channel_ids = ChatChannel.where(project_id: @project.id).pluck(:id)
      ChatChannel.unscoped.where(project_id: @project.id).update_all(scope: "team", project_id: nil)
      if mode == "delete_items"
        trash_project_items
        ChatChannel.where(id: chat_channel_ids).find_each { |channel| Trash.move(channel, current_user) }
      end
      @project.destroy!
    end

    head :no_content
    ChatBroadcast.channels_changed(@team)
  end

  private

  def visible_projects
    @team.projects.where(id: project_access.visible_project_ids)
  end

  def set_project
    @project = visible_projects.find_by(id: params[:id])

    render_error(ErrorCodes::Projects::PROJECT_NOT_FOUND, :not_found) if @project.nil?
  end

  def trash_project_items
    folders = @project.folders.where(parent_id: nil).to_a
    items = @project.pages.where(folder_id: nil).to_a + @project.diagrams.where(folder_id: nil).to_a + @project.boards.to_a

    folders.each { |folder| FolderProject.apply(folder, nil) }
    items.each { |item| item.class.where(id: item.id).update_all(project_id: nil) }
    (folders + items).each do |item|
      item.project_id = nil
      Notifier.item_deleted(item, current_user) { Trash.move(item, current_user) }
    end
  end

  def authorize_project_management!
    render_error(ErrorCodes::Common::FORBIDDEN, :forbidden) unless project_access.can_manage?(@project)
  end

  def save_project(project, status)
    owner_id = (project_params[:owner_user_id].presence || project.owner_user_id).to_i
    member_ids = ([ owner_id ] + Array(project_params[:member_ids]).map(&:to_i)).uniq
    return render_error(ErrorCodes::Projects::PROJECT_INVALID_MEMBERS, :unprocessable_entity) unless team_member_ids?(member_ids)

    previous_description = project.description.to_s
    project.assign_attributes(name: project_params[:name].to_s.strip, description: Mentions.strip_item_labels(project_params[:description].to_s, html: false), owner_user_id: owner_id)

    saved = Project.transaction do
      raise ActiveRecord::Rollback unless project.save

      project.project_members.where.not(user_id: member_ids).destroy_all
      member_ids.each { |user_id| project.project_members.find_or_create_by!(user_id: user_id) }
      true
    end
    return render_project_error(project) unless saved

    ProjectAccessCleanup.for_project(project)
    render json: { project: project_json(project.reload) }, status: status
    ChatBroadcast.channels_changed(@team) if ChatChannel.exists?(project_id: project.id)
    MentionNotifications.call(item: project, before: previous_description, after: project.description, actor: current_user, html: false)
  end

  def team_member_ids?(user_ids)
    (user_ids - @team.memberships.pluck(:user_id)).empty?
  end

  def render_project_error(project)
    code = limit_error_code(project) || (project.errors.of_kind?(:name, :taken) ? ErrorCodes::Projects::PROJECT_NAME_TAKEN : ErrorCodes::Projects::PROJECT_SAVE_FAILED)
    render_error(code, :unprocessable_entity)
  end

  def project_summary_json(project)
    {
      id: project.id,
      name: project.name,
      description: project.description,
      owner: member_json(project.owner),
      member_count: project.project_members.size,
      can_manage: project_access.can_manage?(project)
    }
  end

  def project_json(project)
    project_summary_json(project).merge(
      members: project.members.includes(User::AVATAR_PRELOAD).map { |user| member_json(user) },
      created_at: project.created_at
    )
  end
end
