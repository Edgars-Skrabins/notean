class MembershipRemoval
  EDITING_STATUSES = { PageEditingStatus => :pages, DiagramEditingStatus => :diagrams }.freeze

  def self.apply(membership)
    team = membership.team
    user = membership.user

    Membership.transaction do
      membership.update!(removed_at: Time.current)
      owner = team.memberships.find_by!(role: "owner").user
      team.projects.where(owner: user).find_each { |project| project.update!(owner: owner) }
      ProjectMember.where(project: team.projects, user: user).destroy_all
      TicketAssignee.where(ticket: Ticket.unscoped.where(team: team), user: user).destroy_all
      team.favorites.where(user: user).destroy_all
    end

    EDITING_STATUSES.each do |status_class, items|
      team.public_send(items).pluck(:id).each { |item_id| status_class.stop(item_id, user) }
    end

    ActionCable.server.broadcast(TeamChannel.stream_name(team), { type: "member_removed", user_id: user.id, team: team.as_json(except: [ :password, :password_digest ]) })
  end
end
