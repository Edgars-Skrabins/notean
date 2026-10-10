class ActionsController < ApplicationController
  before_action :authenticate_user!

  def join_team
    @team = Team.find_by(code: team_params[:code])

    if @team.nil?
      render_error(ErrorCodes::Teams::TEAM_NOT_FOUND, :not_found)
      return
    end

    if @team.authenticate(team_params[:password])
      membership = @team.memberships.find_or_initialize_by(user: current_user) do |m|
        m.role = "user"
        m.nickname = team_params[:nickname]
      end
      membership.last_active_at = Time.current

      unless membership.save
        render_nickname_error(membership)
        return
      end

      render json: { team: team_json(@team), role: membership.role, nickname: membership.nickname }
    else
      render_error(ErrorCodes::Teams::WRONG_TEAM_PASSWORD, :unauthorized)
    end
  end
end
