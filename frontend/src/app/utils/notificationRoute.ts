import {Notification} from "@models/notification.model";
import {AppRoutes} from "../app/app-routes.enum";
import {ticketRoute} from "@utils/ticketRoute";
import {chatChannelRoute} from "@utils/chatRoute";

export function notificationRoute(notification: Notification): (string | number)[] | null {
  if (notification.itemId === null) {
    return null;
  }

  switch (notification.itemType) {
    case 'Page':
      return [AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, notification.itemId];
    case 'Diagram':
      return [AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, notification.itemId];
    case 'Project':
      return [AppRoutes.DASHBOARD, AppRoutes.PROJECTS, notification.itemId];
    case 'Ticket':
      return ticketRoute(notification.boardId!, notification.itemId, notification.inBacklog);
    case 'ChatMessage':
      return notification.chatChannelId ? chatChannelRoute(notification.chatChannelId) : null;
  }
}

export function notificationQueryParams(notification: Notification): { message: number } | undefined {
  return notification.itemType === 'ChatMessage' && notification.itemId !== null ? {message: notification.itemId} : undefined;
}
