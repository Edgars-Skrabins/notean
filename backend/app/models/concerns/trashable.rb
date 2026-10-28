module Trashable
  extend ActiveSupport::Concern

  included do
    default_scope { where(trash_entry_id: nil) }

    belongs_to :trash_entry, optional: true
  end

  def trashed?
    trash_entry_id.present?
  end
end
