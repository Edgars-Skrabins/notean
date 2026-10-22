class Page < ApplicationRecord
  include TitleSearchable
  include BelongsToProject
  include TextSearchable

  text_searchable :title, :search_text

  belongs_to :team
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id
  belongs_to :folder, optional: true

  has_many :page_contributors, dependent: :destroy
  has_many :contributors, through: :page_contributors, source: :user
  has_many :favorites, as: :favoritable, dependent: :destroy

  validates :title, presence: true

  before_save { self.search_text = SearchText.from_html(content) if content_changed? }
end
