class Notification < ApplicationRecord
  KINDS = %w[assigned unassigned item_changed item_deleted commented mentioned].freeze
  ITEM_TYPES = %w[Ticket Page Diagram Project ChatMessage].freeze
  FEATURES = { "Ticket" => :boards, "Page" => :pages, "Diagram" => :diagrams, "ChatMessage" => :chat }.freeze
  CHANGED_FIELDS = %w[title description content status priority].freeze
  EXCERPT_MAX_LENGTH = 200
  RETENTION = 30.days

  belongs_to :user
  belongs_to :team
  belongs_to :actor, class_name: "User", foreign_key: :actor_user_id
  belongs_to :item, polymorphic: true, optional: true

  validates :kind, inclusion: { in: KINDS }
  validates :item_type, inclusion: { in: ITEM_TYPES }

  scope :unread, -> { where(read_at: nil) }
  scope :for, ->(user, team) { where(user: user, team: team) }

  def self.visible_to(project_access, team)
    item_types = ITEM_TYPES.select { |type| FEATURES[type].nil? || team.feature_enabled?(FEATURES[type]) }
    project_id_sql = <<~SQL.squish
      CASE
        WHEN notifications.item_type = 'Page' AND visible_pages.id IS NOT NULL THEN visible_pages.project_id
        WHEN notifications.item_type = 'Diagram' AND visible_diagrams.id IS NOT NULL THEN visible_diagrams.project_id
        WHEN notifications.item_type = 'Ticket' AND visible_boards.id IS NOT NULL THEN visible_boards.project_id
        WHEN notifications.item_type = 'ChatMessage' AND visible_chats.id IS NOT NULL THEN visible_chats.project_id
        ELSE notifications.project_id
      END
    SQL

    joins("LEFT JOIN pages visible_pages ON notifications.item_type = 'Page' AND visible_pages.id = notifications.item_id")
      .joins("LEFT JOIN diagrams visible_diagrams ON notifications.item_type = 'Diagram' AND visible_diagrams.id = notifications.item_id")
      .joins("LEFT JOIN boards visible_boards ON notifications.item_type = 'Ticket' AND visible_boards.id = notifications.board_id")
      .joins("LEFT JOIN chat_channels visible_chats ON notifications.item_type = 'ChatMessage' AND visible_chats.id = notifications.chat_channel_id")
      .where(item_type: item_types)
      .where("visible_pages.trash_entry_id IS NULL AND visible_diagrams.trash_entry_id IS NULL AND visible_boards.trash_entry_id IS NULL AND visible_chats.trash_entry_id IS NULL")
      .where(chat_scope_sql(project_access))
      .where("(#{project_id_sql}) IS NULL OR (#{project_id_sql}) IN (?)", project_access.visible_project_ids.presence || [ 0 ])
  end

  def self.chat_scope_sql(project_access)
    return "TRUE" if project_access.manager?

    sanitize_sql_array([ <<~SQL.squish, project_access.user.id ])
      visible_chats.id IS NULL OR visible_chats.scope <> 'users' OR EXISTS (
        SELECT 1 FROM chat_channel_members WHERE chat_channel_members.chat_channel_id = visible_chats.id AND chat_channel_members.user_id = ?
      )
    SQL
  end
end
