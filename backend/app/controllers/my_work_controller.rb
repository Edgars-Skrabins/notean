class MyWorkController < ApplicationController
  include TicketJson

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!

  def index
    return render json: { tickets: [] } unless @team.feature_enabled?(:boards)

    boards = project_filtered(@team.boards)
    return if boards.nil?

    tickets = Ticket
      .without_description
      .where(team: @team, board: boards)
      .where(id: current_user.ticket_assignees.select(:ticket_id))
      .includes(:board, :column, TicketJson::ASSIGNEES_PRELOAD)
      .order(updated_at: :desc)

    render json: { tickets: tickets.map { |ticket| my_work_ticket_json(ticket) } }
  end

  private

  def my_work_ticket_json(ticket)
    {
      id: ticket.id,
      title: ticket.title,
      board_id: ticket.board_id,
      board_title: ticket.board.title,
      column_id: ticket.column_id,
      column_title: ticket.column&.title,
      assignees: assignees_json(ticket),
      updated_at: ticket.updated_at
    }
  end
end
