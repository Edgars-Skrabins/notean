class ChatCable < ApplicationCable::Channel
  def self.stream_name(team, user_id)
    "chat:#{team.id}:user:#{user_id}"
  end

  def subscribed
    @team = Team.find_by(code: params[:team_code])

    if @team && @team.feature_enabled?(:chat) && current_user.memberships.exists?(team: @team)
      stream_from self.class.stream_name(@team, current_user.id)
    else
      reject
    end
  end

  def typing(data)
    return unless @team.reload.feature_enabled?(:chat) && current_user.memberships.exists?(team: @team)

    channel = @team.chat_channels.find_by(id: data["chat_channel_id"])
    ChatBroadcast.typing(channel, current_user) if channel && ChatAccess.new(current_user, @team).visible?(channel)
  end
end
