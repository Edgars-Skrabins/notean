class TicketTagsController < ApplicationController
  include BoardScoped
  include TicketJson
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:boards) }
  before_action :set_board
  before_action :set_ticket

  def create
    tag = @board.tags.find_by(id: create_ticket_tag_params[:tag_id])
    return render_error(ErrorCodes::Tags::TAG_NOT_FOUND, :not_found) if tag.nil?

    ticket_tag = @ticket.ticket_tags.find_or_initialize_by(tag: tag)
    status = ticket_tag.new_record? ? :created : :ok
    if ticket_tag.new_record? && !ticket_tag.save
      return render_error(ErrorCodes::Tags::TICKET_TAG_LIMIT_REACHED, :unprocessable_entity) if ticket_tag.errors.of_kind?(:ticket, :limit_reached)

      return render_error(ErrorCodes::Tags::TAG_SAVE_FAILED, :unprocessable_entity)
    end

    render json: { ticket: ticket_json(@ticket.reload) }, status: status
    BoardBroadcast.tickets_upserted(@board, [ ticket_broadcast_json(@ticket) ])
  end

  def destroy
    ticket_tag = @ticket.ticket_tags.find_by(board_tag_id: params[:tag_id])
    return render_error(ErrorCodes::Tags::TAG_NOT_FOUND, :not_found) if ticket_tag.nil?

    ticket_tag.destroy
    render json: { ticket: ticket_json(@ticket.reload) }
    BoardBroadcast.tickets_upserted(@board, [ ticket_broadcast_json(@ticket) ])
  end

  private

  def set_ticket
    @ticket = @board.tickets.find_by(id: params[:ticket_id])

    render_error(ErrorCodes::Tickets::TICKET_NOT_FOUND, :not_found) if @ticket.nil?
  end
end
