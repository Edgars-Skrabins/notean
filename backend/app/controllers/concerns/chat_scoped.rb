module ChatScoped
  extend ActiveSupport::Concern

  private

  def chat_access
    @chat_access ||= ChatAccess.new(current_user, @team, project_access)
  end

  def set_chat_channel
    channel = @team.chat_channels.includes(:project).find_by(id: params[:chat_channel_id] || params[:id])
    @chat_channel = channel if channel && chat_access.visible?(channel)

    render_error(ErrorCodes::Chat::CHAT_CHANNEL_NOT_FOUND, :not_found) if @chat_channel.nil?
  end
end
