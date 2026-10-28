class TagsController < ApplicationController
  include BoardScoped
  include TagJson
  include TicketJson
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:boards) }
  before_action :set_board
  before_action :set_tag, only: [ :update, :destroy ]

  def create
    tag = @board.tags.new(name: create_tag_params[:name])
    tag.color = create_tag_params[:color].presence || BoardTag.next_color(@board)

    if tag.save
      render json: { tag: tag_json(tag, 0) }, status: :created
      BoardBroadcast.tags_changed(@board, tags_json(@board.reload))
    else
      render_tag_error(tag)
    end
  end

  def update
    @tag.name = update_tag_params[:name] if update_tag_params.key?(:name)
    @tag.color = update_tag_params[:color] if update_tag_params.key?(:color)
    return render_tag_error(@tag) unless @tag.save

    render json: { tags: tags_json(@board.reload) }
    BoardBroadcast.tags_changed(@board, tags_json(@board))
  end

  def destroy
    cleared_ticket_ids = @tag.ticket_tags.pluck(:ticket_id)
    BoardTag.transaction do
      @tag.destroy!
      Ticket.refresh_updated_at(cleared_ticket_ids)
    end

    render json: { tags: tags_json(@board.reload) }
    BoardBroadcast.tags_changed(@board, tags_json(@board), tickets: cleared_tickets_json(cleared_ticket_ids))
  end

  private

  def cleared_tickets_json(ticket_ids)
    return nil if ticket_ids.empty?

    @board.tickets.without_description.includes(TicketJson::ASSIGNEES_PRELOAD, TicketJson::TAGS_PRELOAD).where(id: ticket_ids).map { |ticket| ticket_summary_json(ticket) }
  end

  def set_tag
    @tag = @board.tags.find_by(id: params[:id])

    render_error(ErrorCodes::Tags::TAG_NOT_FOUND, :not_found) if @tag.nil?
  end

  def render_tag_error(tag)
    if tag.errors.of_kind?(:name, :taken)
      render_error(ErrorCodes::Tags::TAG_NAME_TAKEN, :conflict)
    elsif tag.errors.of_kind?(:board, :limit_reached)
      render_error(ErrorCodes::Tags::TAG_LIMIT_REACHED, :unprocessable_entity)
    else
      render_error(ErrorCodes::Tags::TAG_SAVE_FAILED, :unprocessable_entity)
    end
  end
end
