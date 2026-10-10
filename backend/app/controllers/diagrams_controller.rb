class DiagramsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_diagram, only: [:show, :update, :destroy]

  def index
    diagrams = @team.diagrams
    diagrams = diagrams.where('LOWER(title) LIKE ?', "%#{params[:search].downcase}%") if params[:search].present?

    render json: { diagrams: diagrams.map { |diagram| diagram_summary_json(diagram) }, statusMessage: 'Diagrams found' }
  end

  def create
    @diagram = @team.diagrams.new(created_by_user_id: current_user.id, content: '')
    @diagram.title = create_diagram_params[:title].presence || 'Untitled'

    if @diagram.save
      render json: { diagram: diagram_json(@diagram), statusMessage: 'Diagram created successfully' }, status: :created
    else
      render json: { statusMessage: 'Failed to create diagram' }, status: :unprocessable_entity
    end
  end

  def show
    render json: { diagram: diagram_json(@diagram), statusMessage: 'Diagram found' }
  end

  def update
    @diagram.title = update_diagram_params[:title] if update_diagram_params[:title].present?
    @diagram.content = update_diagram_params[:content] if update_diagram_params.key?(:content)
    @diagram.folder_id = update_diagram_params[:folder_id] if update_diagram_params.key?(:folder_id)

    if @diagram.save
      @diagram.diagram_contributors.find_or_create_by!(user: current_user)
      DiagramEditingStatus.stop(@diagram.id, current_user)
      render json: { diagram: diagram_json(@diagram), statusMessage: 'Diagram updated successfully' }
    else
      render json: { statusMessage: 'Failed to update diagram' }, status: :unprocessable_entity
    end
  end

  def destroy
    @diagram.destroy
    head :no_content
  end

  private

  def set_team
    @team = Team.find_by(code: params[:team_code])

    render json: { statusMessage: 'Team not found' }, status: :not_found if @team.nil?
  end

  def authorize_team_member!
    render json: { statusMessage: 'Forbidden' }, status: :forbidden unless current_user.memberships.exists?(team: @team)
  end

  def set_diagram
    @diagram = @team.diagrams.find_by(id: params[:id])

    render json: { statusMessage: 'Diagram not found' }, status: :not_found if @diagram.nil?
  end

  def diagram_summary_json(diagram)
    {
      id: diagram.id,
      title: diagram.title,
      folder_id: diagram.folder_id,
      creator: user_json(diagram.creator),
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
      creator: user_json(diagram.creator),
      contributors: diagram.contributors.map { |user| user_json(user) },
      created_at: diagram.created_at,
      updated_at: diagram.updated_at,
      currently_editing: editing && { id: editing[:user_id], nickname: editing[:nickname] }
    }
  end

  def user_json(user)
    { id: user.id, nickname: team_nicknames[user.id], avatar: avatar_json(user) }
  end
end
