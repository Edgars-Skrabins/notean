import {AppRoutes} from "../app/app-routes.enum";

export function boardRoute(boardId: number): (string | number)[] {
  return [AppRoutes.DASHBOARD, AppRoutes.BOARDS, boardId, AppRoutes.KANBAN];
}

export function ticketRoute(boardId: number, ticketId: number, inBacklog: boolean): (string | number)[] {
  return [AppRoutes.DASHBOARD, AppRoutes.BOARDS, boardId, inBacklog ? AppRoutes.BACKLOG : AppRoutes.KANBAN, AppRoutes.TICKETS, ticketId];
}
