import {AppRoutes} from "../app/app-routes.enum";

export function boardRoute(boardId: number): (string | number)[] {
  return [AppRoutes.DASHBOARD, AppRoutes.BOARDS, boardId, AppRoutes.KANBAN];
}

export function ticketRoute(boardId: number, ticketId: number, inList: boolean): (string | number)[] {
  return [AppRoutes.DASHBOARD, AppRoutes.BOARDS, boardId, inList ? AppRoutes.LIST : AppRoutes.KANBAN, AppRoutes.TICKETS, ticketId];
}
