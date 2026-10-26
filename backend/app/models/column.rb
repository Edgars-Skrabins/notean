class Column < ApplicationRecord
  include ContentLimits

  belongs_to :board

  has_many :tickets, -> { order(:position) }, dependent: :destroy

  validates :title, presence: true, length: { maximum: TITLE_MAX_LENGTH }
  validates :position, presence: true
end
