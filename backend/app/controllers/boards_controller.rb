class BoardsController < ApplicationController
  include TicketJson

  RECENT_TICKETS_LIMIT = 5
  RECENT_ACTIVITY_PERIOD = 7.days

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_board, only: [ :show, :update, :destroy, :overview ]

  def index
    boards = @team.boards.includes(creator: User::AVATAR_PRELOAD).search_title(params[:search])

    render json: { boards: boards.map { |board| board_summary_json(board) } }
  end

  def create
    @board = @team.boards.new(created_by_user_id: current_user.id)
    @board.title = title_or_default(create_board_params[:title])

    if @board.save
      Board::DEFAULT_COLUMN_TITLES.each_with_index do |title, index|
        @board.columns.create!(title: title, position: index)
      end

      render json: { board: board_json(@board) }, status: :created
    else
      render_error(ErrorCodes::Boards::BOARD_CREATE_FAILED, :unprocessable_entity)
    end
  end

  def show
    render json: { board: board_json(@board) }
  end

  def update
    @board.title = update_board_params[:title] if update_board_params[:title].present?

    if @board.save
      render json: { board: board_json(@board) }
    else
      render_error(ErrorCodes::Boards::BOARD_UPDATE_FAILED, :unprocessable_entity)
    end
  end

  def overview
    tickets = @board.tickets
    column_counts = tickets.where.not(column_id: nil).group(:column_id).count
    recent_tickets = tickets.includes(:column).order(updated_at: :desc).limit(RECENT_TICKETS_LIMIT)
    recent_since = RECENT_ACTIVITY_PERIOD.ago

    render json: {
      overview: {
        total_tickets: tickets.count,
        board_tickets: column_counts.values.sum,
        backlog_tickets: tickets.where(column_id: nil).count,
        columns: @board.columns.map { |column| { id: column.id, title: column.title, ticket_count: column_counts.fetch(column.id, 0) } },
        created_last_7_days: tickets.where(created_at: recent_since..).count,
        updated_last_7_days: tickets.where(updated_at: recent_since..).count,
        recent_tickets: recent_tickets.map { |ticket| recent_ticket_json(ticket) }
      }
    }
  end

  def destroy
    @board.destroy
    head :no_content
  end

  private

  def set_board
    @board = @team.boards.includes(:backlog_tickets, creator: User::AVATAR_PRELOAD, columns: :tickets).find_by(id: params[:id])

    render_error(ErrorCodes::Boards::BOARD_NOT_FOUND, :not_found) if @board.nil?
  end

  def board_summary_json(board)
    {
      id: board.id,
      title: board.title,
      creator: member_json(board.creator),
      created_at: board.created_at,
      updated_at: board.updated_at
    }
  end

  def board_json(board)
    board_summary_json(board).merge(
      columns: board.columns.map { |column| column_json(column) },
      backlog: board.backlog_tickets.map { |ticket| ticket_summary_json(ticket) }
    )
  end

  def column_json(column)
    {
      id: column.id,
      title: column.title,
      position: column.position,
      tickets: column.tickets.map { |ticket| ticket_summary_json(ticket) }
    }
  end

  def recent_ticket_json(ticket)
    {
      id: ticket.id,
      title: ticket.title,
      column_id: ticket.column_id,
      column_title: ticket.column&.title,
      updated_at: ticket.updated_at
    }
  end
end
