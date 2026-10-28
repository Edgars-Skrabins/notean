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
      broadcast_columns
    else
      render_error(limit_error_code(@column) || ErrorCodes::Boards::COLUMN_CREATE_FAILED, :unprocessable_entity)
    end
  end

  def update
    @column.title = update_column_params[:title] if update_column_params[:title].present?

    if @column.save
      render json: { column: column_json(@column) }
      broadcast_columns
    else
      render_error(limit_error_code(@column) || ErrorCodes::Boards::COLUMN_UPDATE_FAILED, :unprocessable_entity)
    end
  end

  def destroy
    tickets = @board.tickets.where(column_id: @column.id).to_a
    entries, = Column.transaction do
      Trash.move_tickets(@board, tickets, current_user).tap { @column.destroy! }
    end
    render json: { trash_entry_ids: entries.map(&:id) }
    BoardBroadcast.tickets_removed(@board, tickets.map(&:id)) if tickets.any?
    broadcast_columns
  end

  private

  def set_column
    @column = @board.columns.find_by(id: params[:id])

    render_error(ErrorCodes::Boards::COLUMN_NOT_FOUND, :not_found) if @column.nil?
  end

  def broadcast_columns
    BoardBroadcast.columns_changed(@board, @board.columns.reload.map { |column| column_json(column) })
  end

  def column_json(column)
    {
      id: column.id,
      title: column.title,
      position: column.position
    }
  end
end
