class ProjectsController < ApplicationController
  DELETE_MODES = %w[keep delete_items].freeze

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_project, only: [ :show, :update, :destroy ]
  before_action :authorize_project_management!, only: [ :update, :destroy ]

  def index
    projects = @team.projects
      .where(id: project_access.visible_project_ids)
      .includes(:project_members, owner: User::AVATAR_PRELOAD)
      .order(Arel.sql("LOWER(name)"))

    render json: { projects: projects.map { |project| project_summary_json(project) } }
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
      if mode == "delete_items"
        [ @project.pages, @project.diagrams, @project.boards ].each(&:destroy_all)
        @project.folders.where(parent_id: nil).destroy_all
      end
      @project.destroy!
    end

    head :no_content
  end

  private

  def set_project
    @project = @team.projects.where(id: project_access.visible_project_ids).find_by(id: params[:id])

    render_error(ErrorCodes::Projects::PROJECT_NOT_FOUND, :not_found) if @project.nil?
  end

  def authorize_project_management!
    render_error(ErrorCodes::Common::FORBIDDEN, :forbidden) unless project_access.can_manage?(@project)
  end

  def save_project(project, status)
    owner_id = (project_params[:owner_user_id].presence || project.owner_user_id).to_i
    member_ids = ([ owner_id ] + Array(project_params[:member_ids]).map(&:to_i)).uniq
    return render_error(ErrorCodes::Projects::PROJECT_INVALID_MEMBERS, :unprocessable_entity) unless team_member_ids?(member_ids)

    project.assign_attributes(name: project_params[:name].to_s.strip, description: project_params[:description].to_s, owner_user_id: owner_id)

    saved = Project.transaction do
      raise ActiveRecord::Rollback unless project.save

      project.project_members.where.not(user_id: member_ids).destroy_all
      member_ids.each { |user_id| project.project_members.find_or_create_by!(user_id: user_id) }
      true
    end
    return render_project_error(project) unless saved

    ProjectAccessCleanup.for_project(project)
    render json: { project: project_json(project.reload) }, status: status
  end

  def team_member_ids?(user_ids)
    (user_ids - @team.memberships.pluck(:user_id)).empty?
  end

  def render_project_error(project)
    code = project.errors.of_kind?(:name, :taken) ? ErrorCodes::Projects::PROJECT_NAME_TAKEN : ErrorCodes::Projects::PROJECT_SAVE_FAILED
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
