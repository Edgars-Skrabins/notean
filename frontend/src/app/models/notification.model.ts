import {Result} from "@models/result.model";
import {BoardUser} from "@models/board.model";
import {NotificationsErrorCode, TeamAccessErrorCode} from "@config/errorCodes";

export type NotificationKind = 'assigned' | 'unassigned' | 'item_changed' | 'item_deleted' | 'commented' | 'mentioned';

export type NotificationItemType = 'Ticket' | 'Page' | 'Diagram' | 'Project' | 'ChatMessage';

export type NotificationChangedField = 'title' | 'description' | 'content' | 'status' | 'priority';

export interface Notification {
  id: number;
  kind: NotificationKind;
  itemType: NotificationItemType;
  itemId: number | null;
  itemTitle: string;
  boardId: number | null;
  chatChannelId: number | null;
  inBacklog: boolean;
  changedFields: NotificationChangedField[];
  excerpt: string | null;
  eventCount: number;
  read: boolean;
  occurredAt: string;
  actor: BoardUser;
}

export interface NotificationPage {
  notifications: Notification[];
  hasMore: boolean;
  unreadCount: number;
}

export type NotificationsResponse = Result<NotificationPage, TeamAccessErrorCode>;
export type UnreadCountResponse = Result<{ unreadCount: number }, TeamAccessErrorCode>;
export type NotificationResponse = Result<{ notification: Notification; unreadCount: number }, TeamAccessErrorCode | NotificationsErrorCode>;
