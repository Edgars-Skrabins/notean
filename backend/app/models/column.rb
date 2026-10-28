class Column < ApplicationRecord
  include ContentLimits

  belongs_to :board

  has_many :tickets, -> { order(:position) }, dependent: :destroy

  validates :title, presence: true, length: { maximum: TITLE_MAX_LENGTH }
  validates :position, presence: true

  before_destroy { Ticket.unscoped.where(column_id: id).where.not(trash_entry_id: nil).update_all(column_id: nil) }
end
