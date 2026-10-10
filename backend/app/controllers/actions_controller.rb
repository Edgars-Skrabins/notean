class ActionsController < ApplicationController
  before_action :authenticate_user!

  def join_team
    @team = Team.find_by(code: team_params[:code])

    if @team.nil?
      render json: { statusMessage: "Team not found" }, status: :not_found
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

      render json: {
        team: @team.as_json(except: [ :password, :password_digest ]),
        role: membership.role,
        nickname: membership.nickname,
        statusMessage: "Team joined successfully" },
             status: :ok
    else
      render json: { statusMessage: "Wrong password" }, status: :unauthorized
    end
  end
end
