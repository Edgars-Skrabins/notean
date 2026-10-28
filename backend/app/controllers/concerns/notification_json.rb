module NotificationJson
  extend ActiveSupport::Concern

  PRELOAD = { actor: User::AVATAR_PRELOAD }.freeze

  private

  def notifications_json(notifications)
    ticket_ids = notifications.select { |notification| notification.item_type == "Ticket" && notification.item_id }.map(&:item_id)
    backlog_ticket_ids = ticket_ids.empty? ? [] : Ticket.where(id: ticket_ids, column_id: nil).pluck(:id)

    notifications.map { |notification| notification_json(notification, backlog_ticket_ids) }
  end

  def notification_json(notification, backlog_ticket_ids)
    {
      id: notification.id,
      kind: notification.kind,
      item_type: notification.item_type,
      item_id: notification.item_id,
      item_title: notification.item_title,
      board_id: notification.board_id,
      chat_channel_id: notification.chat_channel_id,
      in_backlog: notification.item_type == "Ticket" && backlog_ticket_ids.include?(notification.item_id),
      changed_fields: notification.changed_fields,
      excerpt: notification.excerpt,
      event_count: notification.event_count,
      read: notification.read_at.present?,
      occurred_at: notification.occurred_at,
      actor: member_json(notification.actor)
    }
  end

  def unread_notification_count(user, team)
    Notification.for(user, team).unread.visible_to(ProjectAccess.new(user, team), team).count
  end
end
