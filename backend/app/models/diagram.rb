class Diagram < ApplicationRecord
  belongs_to :team
  belongs_to :creator, class_name: 'User', foreign_key: :created_by_user_id
  belongs_to :folder, optional: true

  has_many :diagram_contributors, dependent: :destroy
  has_many :contributors, through: :diagram_contributors, source: :user

  validates :title, presence: true
end
