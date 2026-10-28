class Ticket < ApplicationRecord
  include TextSearchable
  include ContentLimits
  include Trashable

  text_searchable :title, :description

  MAX_TAGS = 10

  belongs_to :board
  belongs_to :column, optional: true
  belongs_to :team
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id
  belongs_to :priority, class_name: "BoardPriority", optional: true, inverse_of: :tickets

  has_many :favorites, as: :favoritable, dependent: :destroy
  has_many :comments, as: :commentable, dependent: :destroy
  has_many :ticket_assignees, -> { order(:created_at, :id) }, dependent: :destroy
  has_many :assignees, through: :ticket_assignees, source: :user
  has_many :ticket_tags, dependent: :delete_all
  has_many :tags, through: :ticket_tags

  scope :without_description, -> { select(column_names - %w[description]) }

  before_validation { self.board ||= column&.board }

  validates :title, presence: true, length: { maximum: TITLE_MAX_LENGTH }
  validates :description, length: { maximum: DESCRIPTION_MAX_LENGTH }
  validates :position, presence: true
  validate :column_belongs_to_board
  validate :priority_belongs_to_board

  def self.refresh_updated_at(ticket_ids)
    where(id: ticket_ids).update_all([ "updated_at = ?", Time.current ])
  end

  private

  def column_belongs_to_board
    errors.add(:column, "must belong to the same board") if column && column.board_id != board_id
  end

  def priority_belongs_to_board
    errors.add(:priority, "must belong to the same board") if priority && priority.board_id != board_id
  end
end
