class Board < ApplicationRecord
  include TitleSearchable
  include BelongsToProject
  include TextSearchable

  text_searchable :title

  DEFAULT_COLUMN_TITLES = [ "To Do", "Doing", "Done" ].freeze

  belongs_to :team
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id
  has_many :tickets, dependent: :destroy
  has_many :backlog_tickets, -> { where(column_id: nil).order(:position) }, class_name: "Ticket"
  has_many :columns, -> { order(:position) }, dependent: :destroy
  has_many :priorities, -> { order(:position) }, class_name: "BoardPriority", dependent: :destroy
  has_many :favorites, as: :favoritable, dependent: :destroy

  validates :title, presence: true

  after_create :create_default_priorities

  private

  def create_default_priorities
    BoardPriority::DEFAULTS.each_with_index do |priority, index|
      priorities.create!(name: priority[:name], color: priority[:color], position: index)
    end
  end
end
