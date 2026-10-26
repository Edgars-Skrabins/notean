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
      BoardBroadcast.tickets_upserted(@board, [ ticket_broadcast_json(@ticket), *reindexed_tickets_json ])
    else
      render_error(limit_error_code(@ticket) || ErrorCodes::Tickets::TICKET_UPDATE_FAILED, :unprocessable_entity)
    end
  rescue ActiveRecord::StaleObjectError
    render_error(ErrorCodes::Common::EDIT_CONFLICT, :conflict, extra: { ticket: ticket_json(@board.tickets.includes(:creator, TicketJson::ASSIGNEES_PRELOAD).find(@ticket.id)) })
  end

  def destroy
    @ticket.destroy
    head :no_content
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
      Ticket.transaction { move_tickets(tickets, column) }
    when :add_assignee_id
      user = find_assignable_user(bulk_ticket_params[:add_assignee_id])
      return if user.nil?

      Ticket.transaction { assign_tickets(tickets, user) }
    when :remove_assignee_id
      Ticket.transaction { unassign_tickets(tickets, bulk_ticket_params[:remove_assignee_id]) }
    end

    render json: { tickets: bulk_tickets_json }
    BoardBroadcast.tickets_upserted(@board, bulk_tickets_json + reindexed_tickets_json)
  end

  def bulk_destroy
    return render_error(ErrorCodes::Tickets::BULK_ACTION_INVALID, :unprocessable_entity) if bulk_ticket_ids.empty?

    tickets = load_bulk_tickets
    return if tickets.nil?

    Ticket.transaction do
      column_ids = tickets.map(&:column_id).uniq
      tickets.each(&:destroy!)
      column_ids.each { |column_id| reindex_group(column_id) }
    end
    head :no_content
    BoardBroadcast.tickets_removed(@board, bulk_ticket_ids)
  end

  private

  def set_ticket
    @ticket = @board.tickets.includes(:creator, TicketJson::ASSIGNEES_PRELOAD).find_by(id: params[:id])

    render_error(ErrorCodes::Tickets::TICKET_NOT_FOUND, :not_found) if @ticket.nil?
  end

  def next_position(column)
    (@board.tickets.where(column: column).maximum(:position) || -1) + 1
  end

  def to_backlog?
    ActiveModel::Type::Boolean.new.cast(update_ticket_params[:to_backlog])
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

  def move_tickets(tickets, target_column)
    source_column_ids = tickets.map(&:column_id).uniq - [ target_column&.id ]
    start = (@board.tickets.where(column: target_column).where.not(id: tickets.map(&:id)).maximum(:position) || -1) + 1
    tickets.each_with_index do |ticket, index|
      ticket.update_columns(column_id: target_column&.id, position: start + index, updated_at: Time.current)
    end
    source_column_ids.each { |column_id| reindex_group(column_id) }
  end

  def reindex_group(column_id)
    @board.tickets.where(column_id: column_id).order(:position).each_with_index do |ticket, index|
      next if ticket.position == index

      ticket.update_column(:position, index)
      reindexed_tickets << ticket
    end
  end

  def reindexed_tickets
    @reindexed_tickets ||= []
  end

  def reindexed_tickets_json
    ActiveRecord::Associations::Preloader.new(records: reindexed_tickets, associations: TicketJson::ASSIGNEES_PRELOAD).call
    reindexed_tickets.map { |ticket| ticket_summary_json(ticket) }
  end

  def assign_tickets(tickets, user)
    now = Time.current
    rows = tickets.map { |ticket| { ticket_id: ticket.id, user_id: user.id, created_at: now, updated_at: now } }
    TicketAssignee.insert_all(rows, unique_by: [ :ticket_id, :user_id ])
    @board.tickets.where(id: tickets.map(&:id)).touch_all
  end

  def unassign_tickets(tickets, user_id)
    TicketAssignee.where(ticket_id: tickets.map(&:id), user_id: user_id).delete_all
    @board.tickets.where(id: tickets.map(&:id)).touch_all
  end

  def bulk_tickets_json
    tickets = @board.tickets.includes(TicketJson::ASSIGNEES_PRELOAD).where(id: bulk_ticket_ids).index_by(&:id)
    bulk_ticket_ids.map { |id| ticket_summary_json(tickets[id]) }
  end

  def move_ticket(target_column)
    siblings = @board.tickets.where(column: target_column).where.not(id: @ticket.id).order(:position).to_a
    positions = siblings.to_h { |sibling| [ sibling.id, sibling.position ] }
    @ticket.column = target_column
    @ticket.position = insert_and_reindex(siblings, @ticket, update_ticket_params[:position], :position)
    reindexed_tickets.concat(siblings.reject { |sibling| sibling == @ticket || positions[sibling.id] == sibling.position })
  end
end
