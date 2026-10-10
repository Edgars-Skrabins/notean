class Board < ApplicationRecord
  DEFAULT_COLUMN_TITLES = ['To Do', 'Doing', 'Done'].freeze

  belongs_to :team
  belongs_to :creator, class_name: 'User', foreign_key: :created_by_user_id
  has_many :columns, -> { order(:position) }, dependent: :destroy
  has_many :cards, through: :columns
  has_many :favorites, as: :favoritable, dependent: :destroy

  validates :title, presence: true
end
