class DiagramContributor < ApplicationRecord
  belongs_to :diagram
  belongs_to :user

  validates :user_id, uniqueness: { scope: :diagram_id }
end
