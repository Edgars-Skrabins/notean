class TicketAttachmentsController < ApplicationController
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
    attachment = save_uploaded_attachment(@ticket, "file")
    return unless attachment.is_a?(Attachment)

    render json: { attachment: attachment_json(attachment) }, status: :created
    BoardBroadcast.tickets_upserted(@board, [ ticket_broadcast_json(@ticket.reload) ])
  end

  def destroy
    attachment = @ticket.attachments.find_by(id: params[:id])
    return render_error(ErrorCodes::Attachments::ATTACHMENT_NOT_FOUND, :not_found) if attachment.nil?
    return render_error(ErrorCodes::Common::FORBIDDEN, :forbidden) unless can_delete_attachment?(attachment)

    attachment.destroy
    head :no_content
    BoardBroadcast.tickets_upserted(@board, [ ticket_broadcast_json(@ticket.reload) ])
  end

  private

  def set_ticket
    @ticket = @board.tickets.includes(TicketJson::ASSIGNEES_PRELOAD).find_by(id: params[:ticket_id])

    render_error(ErrorCodes::Tickets::TICKET_NOT_FOUND, :not_found) if @ticket.nil?
  end
end
