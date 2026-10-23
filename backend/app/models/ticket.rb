class Ticket < ApplicationRecord
  include TextSearchable

  text_searchable :title, :description

  belongs_to :board
  belongs_to :column, optional: true
  belongs_to :team
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id
  belongs_to :priority, class_name: "BoardPriority", optional: true, inverse_of: :tickets

  has_many :favorites, as: :favoritable, dependent: :destroy
  has_many :ticket_assignees, -> { order(:created_at, :id) }, dependent: :destroy
  has_many :assignees, through: :ticket_assignees, source: :user

  before_validation { self.board ||= column&.board }

  validates :title, presence: true
  validates :position, presence: true
  validate :column_belongs_to_board
  validate :priority_belongs_to_board

  private

  def column_belongs_to_board
    errors.add(:column, "must belong to the same board") if column && column.board_id != board_id
  end

  def priority_belongs_to_board
    errors.add(:priority, "must belong to the same board") if priority && priority.board_id != board_id
  end
end
