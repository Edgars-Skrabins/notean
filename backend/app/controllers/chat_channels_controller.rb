class ChatChannelsController < ApplicationController
  include ChatJson
  include ChatScoped
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:chat) }
  before_action :set_chat_channel, only: [ :show, :update, :destroy, :leave, :read ]
  before_action :authorize_chat_channel_management!, only: [ :update, :destroy ]

  def index
    channels = filtered_channels
    return if channels.nil?

    channels = channels.includes(:project).order(:created_at, :id).to_a
    unread = unread_counts(channels)
    render json: {
      chat_channels: channels.map { |channel| chat_channel_summary_json(channel, unread_count: unread.fetch(channel.id, 0), can_manage: chat_access.can_manage?(channel)) },
      creatable_scopes: chat_access.creatable_scopes,
      creatable_project_ids: chat_access.creatable_scopes.include?("team") ? project_access.visible_project_ids : chat_access.owned_project_ids
    }
  end

  def show
    render json: { chat_channel: full_json(@chat_channel) }
  end

  def create
    channel = @team.chat_channels.new(name: create_chat_channel_params[:name], scope: create_chat_channel_params[:scope], creator: current_user)
    return render_error(ErrorCodes::Chat::CHAT_CHANNEL_CREATE_FAILED, :unprocessable_entity) unless ChatChannel::SCOPES.include?(channel.scope)

    if channel.scope == "project"
      channel.project = @team.projects.find_by(id: create_chat_channel_params[:project_id])
      return render_error(ErrorCodes::Projects::PROJECT_NOT_FOUND, :not_found) unless channel.project && project_access.project_visible?(channel.project_id)
    end
    return render_error(ErrorCodes::Common::FORBIDDEN, :forbidden) unless chat_access.can_create?(channel.scope, channel.project)

    member_ids = requested_member_ids(create_chat_channel_params) | [ current_user.id ]
    return render_error(ErrorCodes::Chat::CHAT_CHANNEL_MEMBERS_INVALID, :unprocessable_entity) if channel.scope == "users" && !team_member_ids?(member_ids)

    saved = ChatChannel.transaction do
      raise ActiveRecord::Rollback unless channel.save

      member_ids.each { |user_id| channel.chat_channel_members.create!(user_id: user_id) } if channel.scope == "users"
      true
    end
    return render_chat_channel_error(channel, ErrorCodes::Chat::CHAT_CHANNEL_CREATE_FAILED) unless saved

    render json: { chat_channel: full_json(channel) }, status: :created
    ChatBroadcast.channel_upserted(channel)
  end

  def update
    params_hash = update_chat_channel_params
    @chat_channel.name = params_hash[:name] if params_hash.key?(:name)
    @chat_channel.gif_rating = params_hash[:gif_rating] if params_hash.key?(:gif_rating)
    member_ids = params_hash.key?(:member_ids) && @chat_channel.scope == "users" ? requested_member_ids(params_hash) : nil
    return render_error(ErrorCodes::Chat::CHAT_CHANNEL_MEMBERS_INVALID, :unprocessable_entity) if member_ids && (member_ids.empty? || !team_member_ids?(member_ids))

    viewers_before = ChatAccess.user_ids_who_can_see(@chat_channel)
    saved = ChatChannel.transaction do
      raise ActiveRecord::Rollback unless @chat_channel.save

      replace_members(member_ids) if member_ids
      true
    end
    return render_chat_channel_error(@chat_channel, ErrorCodes::Chat::CHAT_CHANNEL_UPDATE_FAILED) unless saved

    render json: { chat_channel: full_json(@chat_channel.reload) }
    ChatBroadcast.channel_upserted(@chat_channel)
    ChatBroadcast.channel_removed(@chat_channel, viewers_before - ChatAccess.user_ids_who_can_see(@chat_channel))
  end

  def destroy
    viewers = ChatAccess.user_ids_who_can_see(@chat_channel)
    Trash.move(@chat_channel, current_user)

    head :no_content
    ChatBroadcast.channel_removed(@chat_channel, viewers)
  end

  def leave
    return render_error(ErrorCodes::Chat::CHAT_CHANNEL_NOT_LEAVABLE, :unprocessable_entity) unless @chat_channel.scope == "users"

    membership = @chat_channel.chat_channel_members.find_by(user: current_user)
    return render_error(ErrorCodes::Chat::CHAT_CHANNEL_NOT_LEAVABLE, :unprocessable_entity) if membership.nil?
    return render_error(ErrorCodes::Chat::CHAT_CHANNEL_LAST_MEMBER, :unprocessable_entity) if @chat_channel.chat_channel_members.count == 1

    viewers_before = ChatAccess.user_ids_who_can_see(@chat_channel)
    membership.destroy!

    head :no_content
    ChatBroadcast.channel_upserted(@chat_channel)
    ChatBroadcast.channel_removed(@chat_channel, viewers_before - ChatAccess.user_ids_who_can_see(@chat_channel))
  end

  def read
    message_id = params[:last_read_message_id].to_i
    ChatReadState.advance(@chat_channel, current_user, message_id) if message_id.positive? && @chat_channel.chat_messages.exists?(id: message_id)

    head :no_content
  end

  private

  def filtered_channels
    channels = chat_access.visible_scope(@team.chat_channels)
    project_id = params[:project_id]
    return channels if project_id.blank?

    unless project_access.project_visible?(project_id)
      render_error(ErrorCodes::Projects::PROJECT_NOT_FOUND, :not_found)
      return nil
    end

    channels.where(project_id: [ nil, project_id.to_i ])
  end

  def unread_counts(channels)
    return {} if channels.empty?

    ChatMessage
      .joins(ActiveRecord::Base.sanitize_sql_array([ "LEFT JOIN chat_read_states ON chat_read_states.chat_channel_id = chat_messages.chat_channel_id AND chat_read_states.user_id = ?", current_user.id ]))
      .where(chat_channel_id: channels.map(&:id))
      .where.not(user_id: current_user.id)
      .where("chat_messages.id > COALESCE(chat_read_states.last_read_message_id, 0)")
      .group(:chat_channel_id)
      .count
  end

  def full_json(channel)
    chat_channel_json(channel, unread_count: unread_counts([ channel ]).fetch(channel.id, 0), can_manage: chat_access.can_manage?(channel))
  end

  def requested_member_ids(params_hash)
    Array(params_hash[:member_ids]).map(&:to_i).uniq
  end

  def team_member_ids?(user_ids)
    (user_ids - @team.users.merge(User.active).pluck(:id)).empty?
  end

  def replace_members(member_ids)
    @chat_channel.chat_channel_members.where.not(user_id: member_ids).delete_all
    (member_ids - @chat_channel.chat_channel_members.pluck(:user_id)).each { |user_id| @chat_channel.chat_channel_members.create!(user_id: user_id) }
  end

  def authorize_chat_channel_management!
    render_error(ErrorCodes::Common::FORBIDDEN, :forbidden) unless chat_access.can_manage?(@chat_channel)
  end

  def render_chat_channel_error(channel, fallback)
    code = limit_error_code(channel) || (channel.errors.of_kind?(:name, :taken) ? ErrorCodes::Chat::CHAT_CHANNEL_NAME_TAKEN : fallback)
    render_error(code, :unprocessable_entity)
  end
end
