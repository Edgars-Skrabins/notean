class ProjectAccess
  MANAGER_ROLES = %w[owner admin].freeze

  def self.users_who_can_see(record)
    team = record.team
    project_id = project_id_of(record)
    return team.users if project_id.nil?

    managers = team.memberships.where(role: MANAGER_ROLES).select(:user_id)
    members = ProjectMember.where(project_id: project_id).select(:user_id)
    team.users.where(id: managers).or(team.users.where(id: members))
  end

  def self.project_id_of(record)
    case record
    when Ticket then record.board.project_id
    when Project then record.id
    else record.project_id
    end
  end

  def initialize(user, team)
    @user = user
    @team = team
  end

  def manager?
    return @manager if defined?(@manager)

    @manager = @team.memberships.exists?(user: @user, role: MANAGER_ROLES)
  end

  def team_owner?
    return @team_owner if defined?(@team_owner)

    @team_owner = @team.memberships.exists?(user: @user, role: "owner")
  end

  def visible_project_ids
    @visible_project_ids ||= manager? ? @team.projects.pluck(:id) : @team.projects.joins(:project_members).where(project_members: { user_id: @user.id }).pluck(:id)
  end

  def project_visible?(project_id)
    visible_project_ids.include?(project_id.to_i)
  end

  def visible?(record)
    project_id = self.class.project_id_of(record)
    project_id.nil? || project_visible?(project_id)
  end

  def in_selection?(record, project_id)
    visible?(record) && (project_id.blank? || self.class.project_id_of(record) == project_id.to_i)
  end

  def attachment_visible?(attachment)
    if attachment.pending?
      attachment.created_by_user_id == @user.id
    elsif attachment.template?
      true
    elsif attachment.ticket?
      @team.feature_enabled?(:boards) && scope(@team.boards).joins(:tickets).exists?(tickets: { id: attachment.attachable_id })
    else
      @team.feature_enabled?(:pages) && scope(@team.pages).exists?(id: attachment.attachable_id)
    end
  end

  def scope(relation)
    relation.where(project_id: [ nil, *visible_project_ids ])
  end

  def filter(relation, project_id)
    project_id.blank? ? scope(relation) : relation.where(project_id: project_id)
  end

  def can_manage?(project)
    project.owner_user_id == @user.id || team_owner?
  end
end
