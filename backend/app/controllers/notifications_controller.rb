class NotificationsController < ApplicationController
  include NotificationJson

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_notification, only: [ :update ]

  def index
    current_user.notifications.where(read_at: ...Notification::RETENTION.ago).delete_all

    notifications = visible_notifications.includes(NotificationJson::PRELOAD).order(occurred_at: :desc, id: :desc)
    notifications = notifications.unread if ActiveModel::Type::Boolean.new.cast(params[:unread])
    notifications, has_more = paginate(notifications)

    render json: { notifications: notifications_json(notifications), has_more: has_more, unread_count: unread_notification_count(current_user, @team) }
  end

  def unread_count
    render json: { unread_count: unread_notification_count(current_user, @team) }
  end

  def update
    read = ActiveModel::Type::Boolean.new.cast(update_notification_params[:read])
    @notification.update!(read_at: read ? @notification.read_at || Time.current : nil)

    unread_count = unread_notification_count(current_user, @team)
    render json: { notification: notifications_json([ @notification ]).first, unread_count: unread_count }
    NotificationBroadcast.read(@team, current_user, [ @notification.id ], read)
  end

  def read_all
    visible_notifications.unread.update_all(read_at: Time.current)

    render json: { unread_count: 0 }
    NotificationBroadcast.read(@team, current_user, "all", true)
  end

  private

  def visible_notifications
    Notification.for(current_user, @team).visible_to(project_access, @team)
  end

  def set_notification
    @notification = visible_notifications.includes(NotificationJson::PRELOAD).find_by(id: params[:id])

    render_error(ErrorCodes::Notifications::NOTIFICATION_NOT_FOUND, :not_found) if @notification.nil?
  end
end
