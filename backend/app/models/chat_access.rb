class ChatAccess
  def self.users_who_can_see(channel)
    team = channel.team
    case channel.scope
    when "team"
      team.users
    when "project"
      ProjectAccess.users_who_can_see(channel)
    else
      managers = team.memberships.where(role: ProjectAccess::MANAGER_ROLES).select(:user_id)
      members = channel.chat_channel_members.select(:user_id)
      team.users.where(id: managers).or(team.users.where(id: members))
    end
  end

  def self.user_ids_who_can_see(channel)
    users_who_can_see(channel).merge(User.active).pluck(:id)
  end

  def initialize(user, team, project_access = ProjectAccess.new(user, team))
    @user = user
    @team = team
    @project_access = project_access
  end

  def visible_scope(relation)
    member_channel_ids = ChatChannelMember.where(user_id: @user.id).select(:chat_channel_id)
    visible = relation.where(scope: "team")
      .or(relation.where(scope: "project", project_id: @project_access.visible_project_ids))
    return visible.or(relation.where(scope: "users")) if @project_access.manager?

    visible.or(relation.where(scope: "users", id: member_channel_ids))
  end

  def visible?(channel)
    return false if channel.trashed?

    case channel.scope
    when "team" then true
    when "project" then @project_access.project_visible?(channel.project_id)
    else @project_access.manager? || channel.chat_channel_members.exists?(user_id: @user.id)
    end
  end

  def can_create?(scope, project = nil)
    return true if @project_access.manager?

    scope == "project" && project.present? && project.owner_user_id == @user.id
  end

  def creatable_scopes
    @project_access.manager? ? ChatChannel::SCOPES : (owned_project_ids.any? ? [ "project" ] : [])
  end

  def owned_project_ids
    @owned_project_ids ||= @team.projects.where(owner_user_id: @user.id).pluck(:id)
  end

  def can_manage?(channel)
    channel.created_by_user_id == @user.id || can_create?(channel.scope, channel.project)
  end
end
