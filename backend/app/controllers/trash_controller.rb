class TrashController < ApplicationController
  include TicketJson

  TYPES = { "page" => "Page", "diagram" => "Diagram", "board" => "Board", "ticket" => "Ticket", "folder" => "Folder", "chat_channel" => "ChatChannel" }.freeze

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_entry, only: :destroy

  def index
    entries = project_filtered(visible_entries)
    return if entries.nil?

    entries = entries.where(item_type: TYPES[params[:type]]) if TYPES.key?(params[:type])
    entries, has_more = paginate(entries.search_title(params[:search]).includes(deleted_by: User::AVATAR_PRELOAD).order(created_at: :desc, id: :desc))
    context = entry_context(entries)

    render json: { trash_entries: entries.map { |entry| trash_entry_json(entry, context) }, has_more: has_more }
  end

  def restore
    entry_ids = Array(restore_trash_params[:entry_ids]).map(&:to_i).uniq
    entries = visible_entries.where(id: entry_ids).to_a
    return render_error(ErrorCodes::Trash::TRASH_ENTRY_NOT_FOUND, :not_found) if entry_ids.empty? || entries.length != entry_ids.length

    TrashEntry.transaction { entries.each { |entry| Trash.restore(entry) } }

    render json: { restored: entries.map { |entry| { item_type: entry.item_type, item_id: entry.item_id } } }
    broadcast_restored_tickets(entries)
    broadcast_restored_chat_channels(entries)
  rescue Trash::BoardInTrash
    render_error(ErrorCodes::Trash::TRASH_BOARD_IN_TRASH, :unprocessable_entity)
  end

  def destroy
    Trash.purge(@entry)
    head :no_content
  end

  def empty
    return unless require_team_role!(@team, :admin, :owner)

    @team.trash_entries.of_features(enabled_features).find_each { |entry| Trash.purge(entry) }
    head :no_content
  end

  private

  def visible_entries
    manageable_chat_entries(project_access.scope(@team.trash_entries).of_features(enabled_features))
  end

  def manageable_chat_entries(entries)
    return entries if project_access.manager?

    channels = ChatChannel.unscoped.where(team_id: @team.id)
    managed = channels.where(created_by_user_id: current_user.id).or(channels.where(project_id: ChatAccess.new(current_user, @team, project_access).owned_project_ids)).select(:id)
    entries.where.not(item_type: "ChatChannel").or(entries.where(item_type: "ChatChannel", item_id: managed))
  end

  def enabled_features
    Team::FEATURES.select { |feature| @team.feature_enabled?(feature) }.map(&:to_sym)
  end

  def set_entry
    @entry = visible_entries.find_by(id: params[:id])

    render_error(ErrorCodes::Trash::TRASH_ENTRY_NOT_FOUND, :not_found) if @entry.nil?
  end

  def entry_context(entries)
    by_type = entries.group_by(&:item_type)
    ticket_boards = Ticket.unscoped.where(id: by_type.fetch("Ticket", []).map(&:item_id)).pluck(:id, :board_id).to_h
    boards = Board.unscoped.where(id: ticket_boards.values).pluck(:id, :title, :trash_entry_id).to_h { |id, title, trash_entry_id| [ id, { id: id, title: title, trashed: trash_entry_id.present? } ] }
    container_ids = by_type.fetch("Board", []).map(&:id) + by_type.fetch("Folder", []).map(&:id)
    children = [ Ticket, Page, Diagram, Folder ].map { |klass| klass.unscoped.where(trash_entry_id: container_ids).group(:trash_entry_id).count }
    children_counts = children.reduce({}) { |counts, group| counts.merge(group) { |_, a, b| a + b } }

    { ticket_boards: ticket_boards, boards: boards, children_counts: children_counts }
  end

  def trash_entry_json(entry, context)
    board = entry.item_type == "Ticket" ? context[:boards][context[:ticket_boards][entry.item_id]] : nil
    children_count = context[:children_counts].fetch(entry.id, 0)
    children_count -= 1 if entry.item_type == "Folder"

    {
      id: entry.id,
      item_type: entry.item_type,
      item_id: entry.item_id,
      title: entry.title,
      project_id: entry.project_id,
      board: board&.slice(:id, :title),
      children_count: [ children_count, 0 ].max,
      restorable: !board&.fetch(:trashed),
      deleted_by: member_json(entry.deleted_by),
      deleted_at: entry.created_at,
      purge_at: entry.purge_at
    }
  end

  def broadcast_restored_chat_channels(entries)
    channel_ids = entries.select { |entry| entry.item_type == "ChatChannel" }.map(&:item_id)
    ChatChannel.where(id: channel_ids).find_each { |channel| ChatBroadcast.channel_upserted(channel) }
  end

  def broadcast_restored_tickets(entries)
    ticket_ids = entries.select { |entry| entry.item_type == "Ticket" }.map(&:item_id)
    Ticket.where(id: ticket_ids).includes(:board, TicketJson::ASSIGNEES_PRELOAD).group_by(&:board).each do |board, tickets|
      BoardBroadcast.tickets_upserted(board, tickets.map { |ticket| ticket_broadcast_json(ticket) })
    end
  end
end
