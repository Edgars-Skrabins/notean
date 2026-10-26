class DiagramsController < ApplicationController
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:diagrams) }
  before_action :set_diagram, only: [ :show, :update, :destroy ]

  def index
    diagrams = project_filtered(@team.diagrams.without_content.includes(creator: User::AVATAR_PRELOAD))
    return if diagrams.nil?

    diagrams = in_listed_folder(diagrams)
    return if diagrams.nil?

    diagrams, has_more = paginate(diagrams.search_title(params[:search]).order(Arel.sql("LOWER(title)"), :id))
    render json: { diagrams: diagrams.map { |diagram| diagram_summary_json(diagram) }, has_more: has_more }
  end

  def create
    @diagram = @team.diagrams.new(created_by_user_id: current_user.id, content: create_diagram_params[:content].to_s)
    @diagram.title = title_or_default(create_diagram_params[:title])
    return unless place_in_folder(@diagram, create_diagram_params, :folder_id)

    if @diagram.save
      render json: { diagram: diagram_json(@diagram) }, status: :created
    else
      render_error(limit_error_code(@diagram) || ErrorCodes::Diagrams::DIAGRAM_CREATE_FAILED, :unprocessable_entity)
    end
  end

  def show
    render json: { diagram: diagram_json(@diagram) }
  end

  def update
    return unless assign_lock_version(@diagram, update_diagram_params, :title, :content)

    @diagram.title = update_diagram_params[:title] if update_diagram_params[:title].present?
    @diagram.content = update_diagram_params[:content] if update_diagram_params.key?(:content)
    return unless place_in_folder(@diagram, update_diagram_params, :folder_id)

    if @diagram.save
      @diagram.diagram_contributors.find_or_create_by!(user: current_user)
      DiagramEditingStatus.stop(@diagram.id, current_user)
      render json: { diagram: diagram_json(find_diagram(@diagram.id)) }
    else
      render_error(limit_error_code(@diagram) || ErrorCodes::Diagrams::DIAGRAM_UPDATE_FAILED, :unprocessable_entity)
    end
  rescue ActiveRecord::StaleObjectError
    render_error(ErrorCodes::Common::EDIT_CONFLICT, :conflict, extra: { diagram: diagram_json(find_diagram(@diagram.id)) })
  end

  def destroy
    @diagram.destroy
    head :no_content
  end

  private

  def find_diagram(id)
    project_access.scope(@team.diagrams).includes(creator: User::AVATAR_PRELOAD, contributors: User::AVATAR_PRELOAD).find_by(id: id)
  end

  def set_diagram
    @diagram = find_diagram(params[:id])

    render_error(ErrorCodes::Diagrams::DIAGRAM_NOT_FOUND, :not_found) if @diagram.nil?
  end

  def diagram_summary_json(diagram)
    {
      id: diagram.id,
      title: diagram.title,
      folder_id: diagram.folder_id,
      project_id: diagram.project_id,
      lock_version: diagram.lock_version,
      creator: member_json(diagram.creator),
      created_at: diagram.created_at,
      updated_at: diagram.updated_at
    }
  end

  def diagram_json(diagram)
    editing = DiagramEditingStatus.read(diagram.id)

    {
      id: diagram.id,
      title: diagram.title,
      content: diagram.content,
      folder_id: diagram.folder_id,
      project_id: diagram.project_id,
      lock_version: diagram.lock_version,
      creator: member_json(diagram.creator),
      contributors: diagram.contributors.map { |user| member_json(user) },
      created_at: diagram.created_at,
      updated_at: diagram.updated_at,
      currently_editing: editing && { id: editing[:user_id], nickname: editing[:nickname] }
    }
  end
end
