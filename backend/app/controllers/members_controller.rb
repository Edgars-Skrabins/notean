class MembersController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!

  def destroy
    actor = require_team_role!(@team, :admin, :owner)
    return unless actor

    target = @team.memberships.find_by(user_id: params[:user_id])
    return render_error(ErrorCodes::Teams::MEMBER_NOT_FOUND, :not_found) unless target
    return render_error(ErrorCodes::Teams::CANNOT_REMOVE_OWNER, :unprocessable_entity) if target.owner?
    return render_error(ErrorCodes::Teams::CANNOT_MANAGE_ADMIN, :forbidden) if actor.admin? && target.admin?

    target.remove!
    render json: { members: members_json(@team) }
  end

  def update_role
    return unless require_team_role!(@team, :owner)

    target = @team.memberships.find_by(user_id: params[:user_id])
    return render_error(ErrorCodes::Teams::MEMBER_NOT_FOUND, :not_found) unless target

    role = update_member_role_params[:role]
    return render_error(ErrorCodes::Teams::ROLE_INVALID, :unprocessable_entity) if target.owner? || !%w[admin user].include?(role)

    target.update!(role: role)
    broadcast_members_changed
    render json: { members: members_json(@team) }
  end

  def transfer_ownership
    actor = require_team_role!(@team, :owner)
    return unless actor

    user_id = transfer_ownership_params[:user_id].to_i
    return render_error(ErrorCodes::Teams::CANNOT_TRANSFER_TO_SELF, :unprocessable_entity) if user_id == current_user.id

    target = @team.memberships.find_by(user_id: user_id)
    return render_error(ErrorCodes::Teams::MEMBER_NOT_FOUND, :not_found) unless target

    Membership.transaction do
      actor.update!(role: "admin")
      target.update!(role: "owner")
    end
    broadcast_members_changed
    render json: { members: members_json(@team), role: "admin" }
  end

  def leave
    membership = membership_for(@team)
    return render_error(ErrorCodes::Teams::OWNER_CANNOT_LEAVE, :unprocessable_entity) if membership.owner?

    membership.remove!
    head :no_content
  end

  private

  def team_code
    params[:code]
  end

  def broadcast_members_changed
    ActionCable.server.broadcast(TeamChannel.stream_name(@team), { type: "members_changed" })
  end
end
