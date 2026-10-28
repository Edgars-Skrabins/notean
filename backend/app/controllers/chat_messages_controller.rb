class ChatMessagesController < ApplicationController
  include ChatJson
  include ChatScoped
  include FeatureGated

  AROUND_SIZE = 25

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:chat) }
  before_action :set_chat_channel
  before_action :set_message, only: [ :update, :destroy ]

  def index
    messages = @chat_channel.chat_messages.includes(*ChatJson::MESSAGE_PRELOAD)
    last_read_message_id = ChatReadState.find_by(chat_channel: @chat_channel, user: current_user)&.last_read_message_id || 0

    if params[:around].present?
      around_id = params[:around].to_i
      older = messages.where("chat_messages.id < ?", around_id).order(id: :desc).limit(AROUND_SIZE + 1).to_a
      newer = messages.where("chat_messages.id >= ?", around_id).order(:id).limit(AROUND_SIZE + 1).to_a
      render json: {
        messages: (older.first(AROUND_SIZE).reverse + newer.first(AROUND_SIZE)).map { |message| chat_message_json(message) },
        has_more_before: older.length > AROUND_SIZE,
        has_more_after: newer.length > AROUND_SIZE,
        last_read_message_id: last_read_message_id
      }
    else
      messages = messages.where("chat_messages.id < ?", params[:before].to_i) if params[:before].present?
      page = messages.order(id: :desc).limit(PAGE_SIZE + 1).to_a
      render json: {
        messages: page.first(PAGE_SIZE).reverse.map { |message| chat_message_json(message) },
        has_more: page.length > PAGE_SIZE,
        last_read_message_id: last_read_message_id
      }
    end
  end

  def create
    message = @chat_channel.chat_messages.new(author: current_user)
    if chat_message_params[:gif_id].present?
      message.kind = "gif"
      message.gif = GiphyClient.find(chat_message_params[:gif_id], rating: @chat_channel.gif_rating)
      return render_error(ErrorCodes::Chat::GIF_NOT_FOUND, :unprocessable_entity) if message.gif.nil?
    else
      message.body = Mentions.strip_item_labels(chat_message_params[:body].to_s, html: false)
    end
    return render_message_error(message) unless message.save

    @chat_channel.update_columns(last_message_at: message.created_at)
    ChatReadState.advance(@chat_channel, current_user, message.id)

    render json: { message: chat_message_json(message) }, status: :created
    ChatBroadcast.message_created(message)
    MentionNotifications.call(item: message, before: "", after: message.body, actor: current_user, html: false) if message.kind == "text"
  rescue GiphyClient::Unavailable
    render_error(ErrorCodes::Chat::GIFS_UNAVAILABLE, :service_unavailable)
  end

  def update
    return render_error(ErrorCodes::Common::FORBIDDEN, :forbidden) unless @message.user_id == current_user.id && @message.kind == "text"

    previous_body = @message.body
    @message.body = Mentions.strip_item_labels(chat_message_params[:body].to_s, html: false)
    @message.edited_at = Time.current if @message.body != previous_body
    return render_message_error(@message) unless @message.save

    render json: { message: chat_message_json(@message) }
    ChatBroadcast.message_updated(@message)
    MentionNotifications.call(item: @message, before: previous_body, after: @message.body, actor: current_user, html: false)
  end

  def destroy
    return render_error(ErrorCodes::Common::FORBIDDEN, :forbidden) unless @message.user_id == current_user.id || project_access.manager?

    ChatMessage.transaction do
      Notifier.chat_message_deleted(@message) { @message.destroy! }
    end

    head :no_content
    ChatBroadcast.message_deleted(@chat_channel, @message.id)
  end

  private

  def set_message
    @message = @chat_channel.chat_messages.includes(*ChatJson::MESSAGE_PRELOAD).find_by(id: params[:id])

    render_error(ErrorCodes::Chat::MESSAGE_NOT_FOUND, :not_found) if @message.nil?
  end

  def render_message_error(message)
    if message.errors.of_kind?(:body, :too_long)
      render_error(ErrorCodes::Common::MESSAGE_TOO_LONG, :unprocessable_entity)
    else
      render_error(ErrorCodes::Chat::MESSAGE_EMPTY, :unprocessable_entity)
    end
  end
end
