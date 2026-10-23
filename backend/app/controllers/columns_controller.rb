class ColumnsController < ApplicationController
  include BoardScoped
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:boards) }
  before_action :set_board
  before_action :set_column, only: [ :update, :destroy ]

  def create
    next_position = @board.columns.maximum(:position).to_i + 1
    @column = @board.columns.new(position: next_position)
    @column.title = title_or_default(create_column_params[:title])

    if @column.save
      render json: { column: column_json(@column) }, status: :created
    else
      render_error(ErrorCodes::Boards::COLUMN_CREATE_FAILED, :unprocessable_entity)
    end
  end

  def update
    @column.title = update_column_params[:title] if update_column_params[:title].present?

    if @column.save
      render json: { column: column_json(@column) }
    else
      render_error(ErrorCodes::Boards::COLUMN_UPDATE_FAILED, :unprocessable_entity)
    end
  end

  def destroy
    @column.destroy
    head :no_content
  end

  private

  def set_column
    @column = @board.columns.find_by(id: params[:id])

    render_error(ErrorCodes::Boards::COLUMN_NOT_FOUND, :not_found) if @column.nil?
  end

  def column_json(column)
    {
      id: column.id,
      title: column.title,
      position: column.position
    }
  end
end
