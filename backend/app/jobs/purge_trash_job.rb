class PurgeTrashJob < ApplicationJob
  def perform
    TrashEntry.expired.find_each { |entry| Trash.purge(entry) }
  end
end
