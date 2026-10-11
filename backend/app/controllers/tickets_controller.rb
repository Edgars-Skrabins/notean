class TicketsController < ApplicationController
  include BoardScoped
  include TicketJson

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_board
  before_action :set_ticket, only: [ :show, :update, :destroy ]

  def create
    column = nil

    if create_ticket_params[:column_id].present?
      column = @board.columns.find_by(id: create_ticket_params[:column_id])
      return render_error(ErrorCodes::Boards::COLUMN_NOT_FOUND, :not_found) if column.nil?
    end

    @ticket = @board.tickets.new(column: column, team: @team, created_by_user_id: current_user.id, position: next_position(column))
    @ticket.title = title_or_default(create_ticket_params[:title])

    if @ticket.save
      render json: { ticket: ticket_json(@ticket) }, status: :created
    else
      render_error(ErrorCodes::Tickets::TICKET_CREATE_FAILED, :unprocessable_entity)
    end
  end

  def show
    render json: { ticket: ticket_json(@ticket) }
  end

  def update
    @ticket.title = update_ticket_params[:title] if update_ticket_params[:title].present?
    @ticket.description = update_ticket_params[:description] if update_ticket_params.key?(:description)

    if to_backlog?
      move_ticket(nil)
    elsif update_ticket_params[:column_id].present?
      column = @board.columns.find_by(id: update_ticket_params[:column_id])
      return render_error(ErrorCodes::Boards::COLUMN_NOT_FOUND, :not_found) if column.nil?

      move_ticket(column)
    elsif update_ticket_params.key?(:position)
      move_ticket(@ticket.column)
    end

    if @ticket.save
      render json: { ticket: ticket_json(@ticket) }
    else
      render_error(ErrorCodes::Tickets::TICKET_UPDATE_FAILED, :unprocessable_entity)
    end
  end

  def destroy
    @ticket.destroy
    head :no_content
  end

  private

  def set_ticket
    @ticket = @board.tickets.includes(:creator).find_by(id: params[:id])

    render_error(ErrorCodes::Tickets::TICKET_NOT_FOUND, :not_found) if @ticket.nil?
  end

  def next_position(column)
    (@board.tickets.where(column: column).maximum(:position) || -1) + 1
  end

  def to_backlog?
    ActiveModel::Type::Boolean.new.cast(update_ticket_params[:to_backlog])
  end

  def move_ticket(target_column)
    siblings = @board.tickets.where(column: target_column).where.not(id: @ticket.id).order(:position).to_a
    @ticket.column = target_column
    @ticket.position = insert_and_reindex(siblings, @ticket, update_ticket_params[:position], :position)
  end
end
