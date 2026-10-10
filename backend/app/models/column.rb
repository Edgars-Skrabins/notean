class Column < ApplicationRecord
  belongs_to :board

  has_many :cards, -> { order(:position) }, dependent: :destroy

  validates :title, presence: true
  validates :position, presence: true
end
