class TrashEntry < ApplicationRecord
  include TitleSearchable

  ITEM_TYPES = %w[Page Diagram Board Ticket Folder ChatChannel].freeze
  RETENTION = 14.days
  TYPE_FEATURES = { "Page" => :pages, "Diagram" => :diagrams, "Board" => :boards, "Ticket" => :boards, "ChatChannel" => :chat }.freeze

  belongs_to :team
  belongs_to :project, optional: true
  belongs_to :deleted_by, class_name: "User", foreign_key: :deleted_by_user_id
  belongs_to :item, -> { unscope(where: :trash_entry_id) }, polymorphic: true

  validates :item_type, inclusion: { in: ITEM_TYPES }

  scope :expired, -> { where("trash_entries.created_at <= ?", RETENTION.ago) }

  def self.of_features(features)
    enabled_types = TYPE_FEATURES.select { |_, feature| features.include?(feature) }.keys
    folder_ids = Folder.unscoped.where(item_type: enabled_types & %w[Page Diagram]).select(:id)

    where(item_type: enabled_types).or(where(item_type: "Folder", item_id: folder_ids))
  end

  def purge_at
    created_at + RETENTION
  end
end
