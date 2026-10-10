class ColumnsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_board
  before_action :set_column, only: [:update, :destroy]

  def create
    next_position = @board.columns.maximum(:position).to_i + 1
    @column = @board.columns.new(position: next_position)
    @column.title = create_column_params[:title].presence || 'Untitled'

    if @column.save
      render json: { column: column_json(@column), statusMessage: 'Column created successfully' }, status: :created
    else
      render json: { statusMessage: 'Failed to create column' }, status: :unprocessable_entity
    end
  end

  def update
    @column.title = update_column_params[:title] if update_column_params[:title].present?

    if @column.save
      render json: { column: column_json(@column), statusMessage: 'Column updated successfully' }
    else
      render json: { statusMessage: 'Failed to update column' }, status: :unprocessable_entity
    end
  end

  def destroy
    @column.destroy
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

  def set_board
    @board = @team.boards.find_by(id: params[:board_id])

    render json: { statusMessage: 'Board not found' }, status: :not_found if @board.nil?
  end

  def set_column
    @column = @board.columns.find_by(id: params[:id])

    render json: { statusMessage: 'Column not found' }, status: :not_found if @column.nil?
  end

  def column_json(column)
    {
      id: column.id,
      title: column.title,
      position: column.position
    }
  end
end
