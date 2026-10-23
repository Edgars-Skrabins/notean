class TeamChannel < ApplicationCable::Channel
  def self.stream_name(team)
    "team:#{team.id}"
  end

  def subscribed
    team = Team.find_by(code: params[:team_code])

    if team && current_user.memberships.exists?(team: team)
      stream_from self.class.stream_name(team)
    else
      reject
    end
  end
end
