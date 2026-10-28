class Page < ApplicationRecord
  include TitleSearchable
  include BelongsToProject
  include TextSearchable
  include ContentLimits

  text_searchable :title, :search_text

  scope :without_content, -> { select(column_names - %w[content search_text]) }

  belongs_to :team
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id
  belongs_to :folder, optional: true

  has_many :page_contributors, dependent: :destroy
  has_many :contributors, through: :page_contributors, source: :user
  has_many :favorites, as: :favoritable, dependent: :destroy
  has_many :comments, as: :commentable, dependent: :destroy

  validates :title, presence: true, length: { maximum: TITLE_MAX_LENGTH }
  validate :folder_matches_item
  validate :content_size

  before_save { self.search_text = SearchText.from_html(content) if content_changed? }

  private

  def content_size
    errors.add(:content, :too_large) if content && content.bytesize > CONTENT_MAX_BYTES
  end

  def folder_matches_item
    return if folder_id.nil?

    errors.add(:folder_id, :invalid) unless folder && folder.team_id == team_id && folder.item_type == self.class.name
    errors.add(:project_id, :project_set_by_folder, message: "must match the folder's project") if folder && folder.project_id != project_id
  end
end
