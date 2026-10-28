class ChatReactionsController < ApplicationController
  include ChatJson
  include ChatScoped
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:chat) }
  before_action :set_chat_channel
  before_action :set_message

  def create
    emoji = chat_reaction_params[:emoji].to_s
    return render_error(ErrorCodes::Chat::CHAT_REACTION_INVALID, :unprocessable_entity) unless ChatReaction.valid_emoji?(emoji)

    emojis = @message.chat_reactions.reorder(nil).distinct.pluck(:emoji)
    return render_error(ErrorCodes::Chat::CHAT_REACTION_LIMIT, :unprocessable_entity) if !emojis.include?(emoji) && emojis.length >= ChatReaction::MAX_DISTINCT

    @message.chat_reactions.find_or_create_by!(user: current_user, emoji: emoji)
    render_reactions
  rescue ActiveRecord::RecordNotUnique
    render_reactions
  end

  def destroy
    @message.chat_reactions.where(user: current_user, emoji: chat_reaction_params[:emoji].to_s).delete_all
    render_reactions
  end

  private

  def set_message
    @message = @chat_channel.chat_messages.find_by(id: params[:message_id])

    render_error(ErrorCodes::Chat::MESSAGE_NOT_FOUND, :not_found) if @message.nil?
  end

  def render_reactions
    reactions = chat_reactions_json(@message.chat_reactions.reload)
    render json: { reactions: reactions }
    ChatBroadcast.reactions_changed(@message, reactions)
  end
end
