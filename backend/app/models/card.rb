class Card < ApplicationRecord
  belongs_to :column
  belongs_to :team
  belongs_to :creator, class_name: 'User', foreign_key: :created_by_user_id

  validates :title, presence: true
  validates :position, presence: true
end
