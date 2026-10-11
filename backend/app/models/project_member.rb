class ProjectMember < ApplicationRecord
  belongs_to :project
  belongs_to :user

  validates :user_id, uniqueness: { scope: :project_id }
  validate :user_is_team_member

  before_destroy :keep_owner

  private

  def user_is_team_member
    return unless project && user

    errors.add(:user, "must be a member of the team") unless project.team.memberships.exists?(user: user)
  end

  def keep_owner
    throw :abort if !destroyed_by_association && user_id == project.owner_user_id
  end
end
