import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {mapBoardUser, RawBoardUser} from "@services/board.service";
import {
  Notification,
  NotificationChangedField,
  NotificationItemType,
  NotificationKind,
  NotificationResponse,
  NotificationsResponse,
  UnreadCountResponse,
} from "@models/notification.model";

export interface RawNotification {
  id: number;
  kind: NotificationKind;
  item_type: NotificationItemType;
  item_id: number | null;
  item_title: string;
  board_id: number | null;
  chat_channel_id: number | null;
  in_backlog: boolean;
  changed_fields: NotificationChangedField[];
  excerpt: string | null;
  event_count: number;
  read: boolean;
  occurred_at: string;
  actor: RawBoardUser;
}

export function mapNotification(raw: RawNotification): Notification {
  return {
    id: raw.id,
    kind: raw.kind,
    itemType: raw.item_type,
    itemId: raw.item_id,
    itemTitle: raw.item_title,
    boardId: raw.board_id,
    chatChannelId: raw.chat_channel_id,
    inBacklog: raw.in_backlog,
    changedFields: raw.changed_fields,
    excerpt: raw.excerpt,
    eventCount: raw.event_count,
    read: raw.read,
    occurredAt: raw.occurred_at,
    actor: mapBoardUser(raw.actor),
  };
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  async list(teamCode: string, offset: number, unreadOnly: boolean): Promise<NotificationsResponse> {
    const params = unreadOnly ? {offset, unread: true} : {offset};
    return apiRequest<NotificationsResponse>(
      axiosInstance.get(teamPath(teamCode, 'notifications'), {params}),
      (data) => ({
        success: true,
        notifications: (data.notifications as RawNotification[]).map(mapNotification),
        hasMore: data.has_more,
        unreadCount: data.unread_count,
      }),
    );
  }

  async unreadCount(teamCode: string): Promise<UnreadCountResponse> {
    return apiRequest<UnreadCountResponse>(
      axiosInstance.get(teamPath(teamCode, 'notifications', 'unread_count')),
      (data) => ({success: true, unreadCount: data.unread_count}),
    );
  }

  async setRead(teamCode: string, id: number, read: boolean): Promise<NotificationResponse> {
    return apiRequest<NotificationResponse>(
      axiosInstance.patch(teamPath(teamCode, 'notifications', id), {notification: {read}}),
      (data) => ({success: true, notification: mapNotification(data.notification), unreadCount: data.unread_count}),
    );
  }

  async readAll(teamCode: string): Promise<UnreadCountResponse> {
    return apiRequest<UnreadCountResponse>(
      axiosInstance.post(teamPath(teamCode, 'notifications', 'read_all')),
      (data) => ({success: true, unreadCount: data.unread_count}),
    );
  }
}
