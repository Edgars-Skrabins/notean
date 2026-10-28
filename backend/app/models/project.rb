class Project < ApplicationRecord
  include TextSearchable
  include ContentLimits

  text_searchable :name, :description

  belongs_to :team
  belongs_to :owner, class_name: "User", foreign_key: :owner_user_id
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id

  has_many :project_members, dependent: :destroy
  has_many :members, through: :project_members, source: :user
  has_many :pages, dependent: :nullify
  has_many :diagrams, dependent: :nullify
  has_many :boards, dependent: :nullify
  has_many :folders, dependent: :nullify
  has_many :notifications, as: :item, dependent: :delete_all

  validates :name, presence: true, length: { maximum: TITLE_MAX_LENGTH }, uniqueness: { scope: :team_id, case_sensitive: false }
  validates :description, length: { maximum: DESCRIPTION_MAX_LENGTH }
  validate :owner_is_team_member

  after_save :ensure_owner_is_member
  before_destroy :release_trashed_items

  private

  def owner_is_team_member
    return unless owner && team

    errors.add(:owner, "must be a member of the team") unless team.memberships.exists?(user: owner)
  end

  def release_trashed_items
    [ Page, Diagram, Board, Folder ].each { |klass| klass.unscoped.where(project_id: id).where.not(trash_entry_id: nil).update_all(project_id: nil) }
  end

  def ensure_owner_is_member
    project_members.find_or_create_by!(user: owner)
  end
end
