import {Notification} from "@models/notification.model";
import {AppRoutes} from "../app/app-routes.enum";
import {ticketRoute} from "@utils/ticketRoute";

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
  }
}
