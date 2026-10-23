class BoardPriority < ApplicationRecord
  COLORS = %w[grey blue teal green yellow orange red purple].freeze
  DEFAULTS = [
    { name: "Very low", color: "grey" },
    { name: "Low", color: "blue" },
    { name: "Medium", color: "yellow" },
    { name: "High", color: "orange" },
    { name: "Very high", color: "red" }
  ].freeze

  belongs_to :board

  has_many :tickets, foreign_key: :priority_id, inverse_of: :priority, dependent: :nullify

  validates :name, presence: true, length: { maximum: 40 }, uniqueness: { scope: :board_id, case_sensitive: false }
  validates :color, inclusion: { in: COLORS }
  validates :position, presence: true
end
