class Ticket < ApplicationRecord
  belongs_to :board
  belongs_to :column, optional: true
  belongs_to :team
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id

  has_many :favorites, as: :favoritable, dependent: :destroy

  before_validation { self.board ||= column&.board }

  validates :title, presence: true
  validates :position, presence: true
  validate :column_belongs_to_board

  private

  def column_belongs_to_board
    errors.add(:column, "must belong to the same board") if column && column.board_id != board_id
  end
end
