class Project < ApplicationRecord
  include TextSearchable

  text_searchable :name, :description

  belongs_to :team
  belongs_to :owner, class_name: "User", foreign_key: :owner_user_id
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id

  has_many :project_members, dependent: :destroy
  has_many :members, through: :project_members, source: :user
  has_many :pages, dependent: :nullify
  has_many :diagrams, dependent: :nullify
  has_many :boards, dependent: :nullify

  validates :name, presence: true, uniqueness: { scope: :team_id, case_sensitive: false }
  validate :owner_is_team_member

  after_save :ensure_owner_is_member

  private

  def owner_is_team_member
    return unless owner && team

    errors.add(:owner, "must be a member of the team") unless team.memberships.exists?(user: owner)
  end

  def ensure_owner_is_member
    project_members.find_or_create_by!(user: owner)
  end
end
