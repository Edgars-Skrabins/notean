class DiagramCommentPin < ApplicationRecord
  belongs_to :team
  belongs_to :diagram
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id
  belongs_to :resolver, class_name: "User", foreign_key: :resolved_by_user_id, optional: true

  has_many :comments, as: :commentable, dependent: :destroy

  validates :x, :y, numericality: true
end
