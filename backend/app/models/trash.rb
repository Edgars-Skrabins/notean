class Trash
  TRASHABLE_CLASSES = [ Page, Diagram, Board, Ticket, Folder ].freeze
  FOLDER_ITEM_CLASSES = { "Page" => Page, "Diagram" => Diagram }.freeze

  class BoardInTrash < StandardError; end

  def self.move(item, user)
    TrashEntry.transaction do
      entry = create_entry(item, user)
      stamp(item, entry)
      entry
    end
  end

  def self.move_tickets(board, tickets, user)
    TrashEntry.transaction do
      entries = tickets.map do |ticket|
        entry = create_entry(ticket, user)
        Ticket.where(id: ticket.id).update_all([ "trash_entry_id = ?", entry.id ])
        entry
      end
      shifts = tickets.group_by(&:column_id).flat_map do |column_id, group|
        TicketPositions.close_gaps(board, column_id, group.map(&:position))
      end
      [ entries, shifts ]
    end
  end

  def self.restore(entry)
    item = entry.item
    raise BoardInTrash if item.is_a?(Ticket) && Board.unscoped.find(item.board_id).trashed?

    TrashEntry.transaction do
      TRASHABLE_CLASSES.each { |klass| klass.unscoped.where(trash_entry_id: entry.id).update_all("trash_entry_id = NULL") }
      place(item)
      entry.destroy!
    end
  end

  def self.purge(entry)
    TrashEntry.transaction do
      item = entry.item
      nested_entries(item).each { |nested| purge(nested) }
      destroy_item(item, entry)
      entry.destroy!
    end
  end

  def self.create_entry(item, user)
    TrashEntry.create!(team_id: item.team_id, item: item, title: item.title, project_id: ProjectAccess.project_id_of(item), deleted_by: user)
  end

  def self.stamp(item, entry)
    case item
    when Folder
      folder_ids = FolderProject.subtree_ids(item)
      Folder.where(id: folder_ids).update_all([ "trash_entry_id = ?", entry.id ])
      FOLDER_ITEM_CLASSES.fetch(item.item_type).where(folder_id: folder_ids).update_all([ "trash_entry_id = ?", entry.id ])
    when Board
      Board.where(id: item.id).update_all([ "trash_entry_id = ?", entry.id ])
      Ticket.where(board_id: item.id).update_all([ "trash_entry_id = ?", entry.id ])
    else
      item.class.where(id: item.id).update_all([ "trash_entry_id = ?", entry.id ])
    end
  end

  def self.place(item)
    case item
    when Page, Diagram
      item.class.where(id: item.id).update_all(folder_id: nil) if item.folder_id && !Folder.exists?(item.folder_id)
    when Folder
      Folder.where(id: item.id).update_all(parent_id: nil) if item.parent_id && !Folder.exists?(item.parent_id)
    when Ticket
      board = Board.find(item.board_id)
      column_id = board.columns.exists?(item.column_id) ? item.column_id : nil
      TicketPositions.append(board, column_id, [ item.id ])
    end
  end

  def self.nested_entries(item)
    case item
    when Board
      TrashEntry.where(item_type: "Ticket", item_id: Ticket.unscoped.where(board_id: item.id).select(:id))
    when Folder
      folder_ids = all_subtree_ids(item)
      contents = FOLDER_ITEM_CLASSES.fetch(item.item_type).unscoped.where(folder_id: folder_ids).select(:id)
      TrashEntry.where(item_type: "Folder", item_id: folder_ids - [ item.id ]).or(TrashEntry.where(item_type: item.item_type, item_id: contents)).to_a
    else
      []
    end
  end

  def self.all_subtree_ids(folder)
    ids = [ folder.id ]
    level = ids

    while level.any?
      level = Folder.unscoped.where(parent_id: level).pluck(:id)
      ids += level
    end

    ids
  end

  def self.destroy_item(item, entry)
    case item
    when Folder
      FOLDER_ITEM_CLASSES.fetch(item.item_type).unscoped.where(trash_entry_id: entry.id).find_each(&:destroy!)
      folders = Folder.unscoped.where(trash_entry_id: entry.id)
      folders.update_all(parent_id: nil)
      folders.delete_all
    when Board
      Ticket.unscoped.where(board_id: item.id).find_each(&:destroy!)
      item.destroy!
    else
      item.destroy!
    end
  end

  private_class_method :create_entry, :stamp, :place, :nested_entries, :all_subtree_ids, :destroy_item
end
