class BoardTag < ApplicationRecord
  NAME_MAX_LENGTH = 24
  MAX_PER_BOARD = 100
  COLORS = BoardPriority::COLORS

  belongs_to :board

  has_many :ticket_tags, dependent: :delete_all
  has_many :tickets, through: :ticket_tags

  before_validation { self.name = name.strip if name }

  validates :name, presence: true, length: { maximum: NAME_MAX_LENGTH }, uniqueness: { scope: :board_id, case_sensitive: false }
  validates :color, inclusion: { in: COLORS }
  validate :board_limit, on: :create

  def self.next_color(board)
    counts = board.tags.unscope(:order).group(:color).count
    COLORS.min_by { |color| [ counts.fetch(color, 0), COLORS.index(color) ] }
  end

  private

  def board_limit
    errors.add(:board, :limit_reached) if board && board.tags.count >= MAX_PER_BOARD
  end
end
