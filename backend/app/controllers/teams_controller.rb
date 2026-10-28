class TeamsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team, only: [ :activate, :members, :update_nickname, :update, :update_features, :storage_usage, :destroy ]

  def mine
    membership = active_membership(current_user)
    render json: {
      team: membership&.team&.then { |team| team_json(team) },
      role: membership&.role,
      nickname: membership&.nickname
    }
  end

  def mine_all
    memberships = current_user.memberships.includes(:team).order(last_active_at: :desc)
    render json: {
      teams: memberships.map { |m| team_json(m.team).merge(role: m.role, nickname: m.nickname) }
    }
  end

  def activate
    membership = membership_for(@team)
    return render_error(ErrorCodes::Teams::NOT_TEAM_MEMBER, :forbidden) unless membership

    membership.update!(last_active_at: Time.current)
    render json: { team: team_json(@team), role: membership.role, nickname: membership.nickname }
  end

  def members
    return render_error(ErrorCodes::Teams::NOT_TEAM_MEMBER, :forbidden) unless membership_for(@team)

    render json: { members: members_json(@team) }
  end

  def create
    @team = Team.new(create_team_params.except(:nickname))
    membership = nil

    Team.transaction do
      raise ActiveRecord::Rollback unless @team.save

      membership = @team.memberships.new(user: current_user, role: "owner", nickname: create_team_params[:nickname], last_active_at: Time.current)
      raise ActiveRecord::Rollback unless membership.save
    end

    if membership.nil?
      render_error(limit_error_code(@team) || ErrorCodes::Teams::TEAM_CREATE_FAILED, :unprocessable_entity)
    elsif membership.persisted?
      render json: { team: team_json(@team), role: "owner", nickname: membership.nickname }, status: :created
    else
      render_nickname_error(membership)
    end
  end

  def update_nickname
    membership = membership_for(@team)
    return render_error(ErrorCodes::Teams::NOT_TEAM_MEMBER, :forbidden) unless membership

    if membership.update(nickname: update_membership_params[:nickname])
      render json: { nickname: membership.nickname }
    else
      render_nickname_error(membership)
    end
  end

  def update
    return unless require_team_role!(@team, :admin, :owner)

    if @team.update(update_team_params)
      render json: { team: team_json(@team) }
    else
      render_error(limit_error_code(@team) || ErrorCodes::Teams::TEAM_RENAME_FAILED, :unprocessable_entity)
    end
  end

  def update_features
    return unless require_team_role!(@team, :owner)

    @team.update!(update_team_features_params)
    ActionCable.server.broadcast(TeamChannel.stream_name(@team), { type: "features_changed", team: team_json(@team) })
    render json: { team: team_json(@team) }
  end

  def storage_usage
    return unless require_team_role!(@team, :admin, :owner)

    render json: { storage: { used_bytes: Attachment.team_usage(@team), quota_bytes: Attachment::TEAM_QUOTA_BYTES } }
  end

  def destroy
    return unless require_team_role!(@team, :owner)

    @team.destroy!
    head :no_content
  end

  private

  def team_code
    params[:code]
  end
end
