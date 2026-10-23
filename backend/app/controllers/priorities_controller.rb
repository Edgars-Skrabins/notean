class PrioritiesController < ApplicationController
  include BoardScoped
  include PriorityJson
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:boards) }
  before_action :set_board
  before_action :set_priority, only: [ :update, :destroy ]

  def create
    priority = @board.priorities.new(position: (@board.priorities.maximum(:position) || -1) + 1)
    priority.name = create_priority_params[:name]
    priority.color = create_priority_params[:color]

    if priority.save
      render json: { priority: priority_json(priority, 0) }, status: :created
    else
      render_priority_error(priority)
    end
  end

  def update
    @priority.name = update_priority_params[:name] if update_priority_params.key?(:name)
    @priority.color = update_priority_params[:color] if update_priority_params.key?(:color)
    return render_priority_error(@priority) unless @priority.valid?

    BoardPriority.transaction do
      if update_priority_params.key?(:position)
        siblings = @board.priorities.where.not(id: @priority.id).to_a
        @priority.position = insert_and_reindex(siblings, @priority, update_priority_params[:position], :position)
      end
      @priority.save!
    end

    render json: { priorities: priorities_json(@board.reload) }
  end

  def destroy
    BoardPriority.transaction do
      @priority.destroy!
      @board.priorities.reload.each_with_index do |priority, index|
        priority.update_column(:position, index) unless priority.position == index
      end
    end

    render json: { priorities: priorities_json(@board.reload) }
  end

  private

  def set_priority
    @priority = @board.priorities.find_by(id: params[:id])

    render_error(ErrorCodes::Priorities::PRIORITY_NOT_FOUND, :not_found) if @priority.nil?
  end

  def render_priority_error(priority)
    if priority.errors.of_kind?(:name, :taken)
      render_error(ErrorCodes::Priorities::PRIORITY_NAME_TAKEN, :conflict)
    else
      render_error(ErrorCodes::Priorities::PRIORITY_SAVE_FAILED, :unprocessable_entity)
    end
  end
end
