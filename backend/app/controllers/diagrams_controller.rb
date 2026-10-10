class DiagramsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_diagram, only: [ :show, :update, :destroy ]

  def index
    diagrams = @team.diagrams.search_title(params[:search])

    render json: { diagrams: diagrams.map { |diagram| diagram_summary_json(diagram) } }
  end

  def create
    @diagram = @team.diagrams.new(created_by_user_id: current_user.id, content: "")
    @diagram.title = title_or_default(create_diagram_params[:title])

    if @diagram.save
      render json: { diagram: diagram_json(@diagram) }, status: :created
    else
      render_error(ErrorCodes::Diagrams::DIAGRAM_CREATE_FAILED, :unprocessable_entity)
    end
  end

  def show
    render json: { diagram: diagram_json(@diagram) }
  end

  def update
    @diagram.title = update_diagram_params[:title] if update_diagram_params[:title].present?
    @diagram.content = update_diagram_params[:content] if update_diagram_params.key?(:content)
    @diagram.folder_id = update_diagram_params[:folder_id] if update_diagram_params.key?(:folder_id)

    if @diagram.save
      @diagram.diagram_contributors.find_or_create_by!(user: current_user)
      DiagramEditingStatus.stop(@diagram.id, current_user)
      render json: { diagram: diagram_json(@diagram) }
    else
      render_error(ErrorCodes::Diagrams::DIAGRAM_UPDATE_FAILED, :unprocessable_entity)
    end
  end

  def destroy
    @diagram.destroy
    head :no_content
  end

  private

  def set_diagram
    @diagram = @team.diagrams.find_by(id: params[:id])

    render_error(ErrorCodes::Diagrams::DIAGRAM_NOT_FOUND, :not_found) if @diagram.nil?
  end

  def diagram_summary_json(diagram)
    {
      id: diagram.id,
      title: diagram.title,
      folder_id: diagram.folder_id,
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
      creator: member_json(diagram.creator),
      contributors: diagram.contributors.map { |user| member_json(user) },
      created_at: diagram.created_at,
      updated_at: diagram.updated_at,
      currently_editing: editing && { id: editing[:user_id], nickname: editing[:nickname] }
    }
  end
end
