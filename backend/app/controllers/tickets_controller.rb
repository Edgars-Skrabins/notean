class TicketsController < ApplicationController
  include BoardScoped
  include TicketJson
  include FeatureGated

  BULK_ACTIONS = [ :column_id, :to_backlog, :add_assignee_id, :remove_assignee_id ].freeze

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:boards) }
  before_action :set_board
  before_action :set_ticket, only: [ :show, :update, :destroy ]

  def index
    tickets = tickets_in_status
    return if tickets.nil?

    tickets = tickets.text_search(params[:search]) if params[:search].present?
    tickets, has_more = paginate(tag_filtered(assignee_filtered(tickets)).without_description.includes(TicketJson::ASSIGNEES_PRELOAD, TicketJson::TAGS_PRELOAD).order(:position, :id))

    render json: { tickets: tickets.map { |ticket| ticket_summary_json(ticket) }, has_more: has_more }
  end

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
      BoardBroadcast.tickets_upserted(@board, [ ticket_broadcast_json(@ticket) ])
    else
      render_error(limit_error_code(@ticket) || ErrorCodes::Tickets::TICKET_CREATE_FAILED, :unprocessable_entity)
    end
  end

  def show
    render json: { ticket: ticket_json(@ticket) }
  end

  def update
    return unless assign_lock_version(@ticket, update_ticket_params, :title, :description)

    @ticket.title = update_ticket_params[:title] if update_ticket_params[:title].present?
    @ticket.description = update_ticket_params[:description] if update_ticket_params.key?(:description)

    if update_ticket_params.key?(:priority_id)
      priority_id = update_ticket_params[:priority_id]
      @ticket.priority = priority_id.nil? ? nil : @board.priorities.find_by(id: priority_id)
      return render_error(ErrorCodes::Priorities::PRIORITY_NOT_FOUND, :not_found) if priority_id && @ticket.priority.nil?
    end

    target_column = @ticket.column
    if to_backlog?
      target_column = nil
    elsif update_ticket_params[:column_id].present?
      target_column = @board.columns.find_by(id: update_ticket_params[:column_id])
      return render_error(ErrorCodes::Boards::COLUMN_NOT_FOUND, :not_found) if target_column.nil?
    end
    moving = to_backlog? || update_ticket_params[:column_id].present? || update_ticket_params.key?(:position)

    saved = Ticket.transaction do
      shift_for_move(target_column) if moving
      @ticket.save || raise(ActiveRecord::Rollback)
    end

    if saved
      render json: { ticket: ticket_json(@ticket) }
      BoardBroadcast.tickets_shifted(@board, ticket_shifts) if ticket_shifts.any?
      BoardBroadcast.tickets_upserted(@board, [ ticket_broadcast_json(@ticket) ])
    else
      render_error(limit_error_code(@ticket) || ErrorCodes::Tickets::TICKET_UPDATE_FAILED, :unprocessable_entity)
    end
  rescue ActiveRecord::StaleObjectError
    render_error(ErrorCodes::Common::EDIT_CONFLICT, :conflict, extra: { ticket: ticket_json(@board.tickets.includes(:creator, TicketJson::ASSIGNEES_PRELOAD, TicketJson::TAGS_PRELOAD).find(@ticket.id)) })
  end

  def destroy
    shifts = Ticket.transaction do
      @ticket.destroy!
      TicketPositions.shift(@board, @ticket.column_id, from: @ticket.position + 1, delta: -1)
    end
    head :no_content
    BoardBroadcast.tickets_shifted(@board, shifts)
    BoardBroadcast.tickets_removed(@board, [ @ticket.id ])
  end

  def bulk_update
    return render_error(ErrorCodes::Tickets::BULK_ACTION_INVALID, :unprocessable_entity) unless valid_bulk_action?

    tickets = load_bulk_tickets
    return if tickets.nil?

    case bulk_action
    when :column_id, :to_backlog
      column = nil
      if bulk_action == :column_id
        column = @board.columns.find_by(id: bulk_ticket_params[:column_id])
        return render_error(ErrorCodes::Boards::COLUMN_NOT_FOUND, :not_found) if column.nil?
      end
      Ticket.transaction { append_tickets(tickets, column) }
    when :add_assignee_id
      user = find_assignable_user(bulk_ticket_params[:add_assignee_id])
      return if user.nil?

      Ticket.transaction { assign_tickets(tickets, user) }
    when :remove_assignee_id
      Ticket.transaction { unassign_tickets(tickets, bulk_ticket_params[:remove_assignee_id]) }
    end

    render json: { tickets: bulk_tickets_json }
    BoardBroadcast.tickets_shifted(@board, ticket_shifts) if ticket_shifts.any?
    BoardBroadcast.tickets_upserted(@board, bulk_tickets_json)
  end

  def bulk_destroy
    return render_error(ErrorCodes::Tickets::BULK_ACTION_INVALID, :unprocessable_entity) if bulk_ticket_ids.empty?

    tickets = load_bulk_tickets
    return if tickets.nil?

    Ticket.transaction do
      tickets.each(&:destroy!)
      close_source_gaps(tickets)
    end
    head :no_content
    BoardBroadcast.tickets_shifted(@board, ticket_shifts)
    BoardBroadcast.tickets_removed(@board, bulk_ticket_ids)
  end

  private

  def set_ticket
    @ticket = @board.tickets.includes(:creator, TicketJson::ASSIGNEES_PRELOAD, TicketJson::TAGS_PRELOAD).find_by(id: params[:id])

    render_error(ErrorCodes::Tickets::TICKET_NOT_FOUND, :not_found) if @ticket.nil?
  end

  def next_position(column)
    (@board.tickets.where(column: column).maximum(:position) || -1) + 1
  end

  def to_backlog?
    ActiveModel::Type::Boolean.new.cast(update_ticket_params[:to_backlog])
  end

  def tickets_in_status
    status = params[:status]
    if status.blank?
      render_error(ErrorCodes::Tickets::TICKET_STATUS_REQUIRED, :unprocessable_entity)
      return nil
    end
    return @board.tickets.where(column_id: nil) if status == "backlog"

    column = @board.columns.find_by(id: status)
    if column.nil?
      render_error(ErrorCodes::Boards::COLUMN_NOT_FOUND, :not_found)
      return nil
    end

    @board.tickets.where(column: column)
  end

  def assignee_filtered(tickets)
    assignee_ids = Array(params[:assignee_ids]).map(&:to_s)
    return tickets if assignee_ids.empty?

    member_ids = assignee_ids - [ "none" ]
    filtered = tickets.where(id: TicketAssignee.where(user_id: member_ids).select(:ticket_id))
    return filtered unless assignee_ids.include?("none")

    filtered.or(tickets.where(TicketAssignee.where("ticket_assignees.ticket_id = tickets.id").arel.exists.not))
  end

  def tag_filtered(tickets)
    tag_ids = Array(params[:tag_ids]).map(&:to_s)
    return tickets if tag_ids.empty?

    filtered = tickets.where(id: TicketTag.where(board_tag_id: tag_ids - [ "none" ]).select(:ticket_id))
    return filtered unless tag_ids.include?("none")

    filtered.or(tickets.where(TicketTag.where("ticket_tags.ticket_id = tickets.id").arel.exists.not))
  end

  def bulk_ticket_ids
    Array(bulk_ticket_params[:ticket_ids]).map(&:to_i).uniq
  end

  def bulk_actions_given
    BULK_ACTIONS.select do |action|
      value = bulk_ticket_params[action]
      action == :to_backlog ? ActiveModel::Type::Boolean.new.cast(value) : value.present?
    end
  end

  def bulk_action
    bulk_actions_given.first
  end

  def valid_bulk_action?
    bulk_ticket_ids.any? && bulk_actions_given.length == 1
  end

  def load_bulk_tickets
    tickets = @board.tickets.where(id: bulk_ticket_ids).index_by(&:id)
    if tickets.length != bulk_ticket_ids.length
      render_error(ErrorCodes::Tickets::TICKET_NOT_FOUND, :not_found)
      return nil
    end
    bulk_ticket_ids.map { |id| tickets[id] }
  end

  def append_tickets(tickets, target_column)
    TicketPositions.append(@board, target_column&.id, tickets.map(&:id))
    close_source_gaps(tickets)
  end

  def close_source_gaps(tickets)
    tickets.group_by(&:column_id).each do |column_id, group|
      ticket_shifts.concat(TicketPositions.close_gaps(@board, column_id, group.map(&:position)))
    end
  end

  def ticket_shifts
    @ticket_shifts ||= []
  end

  def assign_tickets(tickets, user)
    now = Time.current
    rows = tickets.map { |ticket| { ticket_id: ticket.id, user_id: user.id, created_at: now, updated_at: now } }
    TicketAssignee.insert_all(rows, unique_by: [ :ticket_id, :user_id ])
    Ticket.refresh_updated_at(tickets.map(&:id))
  end

  def unassign_tickets(tickets, user_id)
    TicketAssignee.where(ticket_id: tickets.map(&:id), user_id: user_id).delete_all
    Ticket.refresh_updated_at(tickets.map(&:id))
  end

  def bulk_tickets_json
    tickets = @board.tickets.without_description.includes(TicketJson::ASSIGNEES_PRELOAD, TicketJson::TAGS_PRELOAD).where(id: bulk_ticket_ids).index_by(&:id)
    bulk_ticket_ids.map { |id| ticket_summary_json(tickets[id]) }
  end

  def shift_for_move(target_column)
    source_id = @ticket.column_id
    target_id = target_column&.id
    old_position = @ticket.position
    size = @board.tickets.where(column_id: target_id).where.not(id: @ticket.id).count
    requested = update_ticket_params[:position]
    index = requested.nil? ? size : requested.to_i.clamp(0, size)

    if source_id != target_id
      ticket_shifts.concat(TicketPositions.shift(@board, source_id, from: old_position + 1, delta: -1))
      ticket_shifts.concat(TicketPositions.shift(@board, target_id, from: index, delta: 1))
    elsif index > old_position
      ticket_shifts.concat(TicketPositions.shift(@board, source_id, from: old_position + 1, to: index, delta: -1))
    elsif index < old_position
      ticket_shifts.concat(TicketPositions.shift(@board, source_id, from: index, to: old_position - 1, delta: 1))
    end

    @ticket.column = target_column
    @ticket.position = index
  end
end
