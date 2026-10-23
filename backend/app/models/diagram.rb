class Diagram < ApplicationRecord
  include TitleSearchable
  include BelongsToProject
  include TextSearchable

  text_searchable :title, :search_text

  belongs_to :team
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id
  belongs_to :folder, optional: true

  has_many :diagram_contributors, dependent: :destroy
  has_many :contributors, through: :diagram_contributors, source: :user
  has_many :favorites, as: :favoritable, dependent: :destroy

  validates :title, presence: true
  validate :folder_matches_item

  before_save { self.search_text = SearchText.from_diagram(content) if content_changed? }

  private

  def folder_matches_item
    return if folder_id.nil?

    errors.add(:folder_id, :invalid) unless folder && folder.team_id == team_id && folder.item_type == self.class.name
  end
end
