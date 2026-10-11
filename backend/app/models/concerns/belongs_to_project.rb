module BelongsToProject
  extend ActiveSupport::Concern

  included do
    belongs_to :project, optional: true

    validate :project_belongs_to_team
  end

  private

  def project_belongs_to_team
    errors.add(:project, "must belong to the same team") if project && project.team_id != team_id
  end
end
