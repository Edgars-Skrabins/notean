class TicketAssigneesController < ApplicationController
  include BoardScoped
  include TicketJson
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:boards) }
  before_action :set_board
  before_action :set_ticket
  before_action :authorize_assignee_change!

  def create
    user = find_assignable_user(create_assignee_params[:user_id])
    return if user.nil?

    assignee = @ticket.ticket_assignees.find_or_initialize_by(user: user)
    status = assignee.new_record? ? :created : :ok
    assignee.save! if assignee.new_record?

    render json: { ticket: ticket_json(@ticket.reload) }, status: status
    BoardBroadcast.tickets_upserted(@board, [ ticket_broadcast_json(@ticket) ])
  end

  def destroy
    assignee = @ticket.ticket_assignees.find_by(user_id: params[:user_id])
    return render_error(ErrorCodes::Tickets::ASSIGNEE_NOT_FOUND, :not_found) if assignee.nil?

    assignee.destroy
    render json: { ticket: ticket_json(@ticket.reload) }
    BoardBroadcast.tickets_upserted(@board, [ ticket_broadcast_json(@ticket) ])
  end

  private

  def set_ticket
    @ticket = @board.tickets.find_by(id: params[:ticket_id])

    render_error(ErrorCodes::Tickets::TICKET_NOT_FOUND, :not_found) if @ticket.nil?
  end

  def authorize_assignee_change!
  end
end
