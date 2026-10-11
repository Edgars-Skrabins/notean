class Page < ApplicationRecord
  include TitleSearchable
  include BelongsToProject

  belongs_to :team
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id
  belongs_to :folder, optional: true

  has_many :page_contributors, dependent: :destroy
  has_many :contributors, through: :page_contributors, source: :user
  has_many :favorites, as: :favoritable, dependent: :destroy

  validates :title, presence: true
end
