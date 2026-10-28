class NotificationBroadcast
  include Rails.application.routes.url_helpers
  include MemberJson
  include NotificationJson

  def self.upserted(notification_ids)
    Notification.where(id: notification_ids).includes(:team, :user, NotificationJson::PRELOAD).order(:occurred_at, :id).group_by(&:team).each do |team, notifications|
      new(team).upserted(notifications)
    end
  end

  def self.removed(team, ids_by_user)
    ids_by_user.each { |user, ids| new(team).removed(user, ids) }
  end

  def self.read(team, user, ids, read)
    new(team).read(user, ids, read)
  end

  def initialize(team)
    @team = team
  end

  def upserted(notifications)
    notifications_by_user = notifications.group_by(&:user)
    json_by_id = notifications_json(notifications).index_by { |json| json[:id] }

    notifications_by_user.each do |user, user_notifications|
      unread_count = unread_notification_count(user, @team)
      user_notifications.each do |notification|
        broadcast(user, type: "notification_upserted", notification: json_by_id[notification.id], unread_count: unread_count)
      end
    end
  end

  def removed(user, ids)
    broadcast(user, type: "notification_removed", ids: ids, unread_count: unread_notification_count(user, @team))
  end

  def read(user, ids, read)
    broadcast(user, type: "notifications_read", ids: ids, read: read, unread_count: unread_notification_count(user, @team))
  end

  private

  def broadcast(user, payload)
    ActionCable.server.broadcast(NotificationChannel.stream_name(user), payload.merge(team_code: @team.code))
  end
end
