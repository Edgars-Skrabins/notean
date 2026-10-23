import {boardRoute, ticketRoute} from "./ticketRoute";
import {AppRoutes} from "../app/app-routes.enum";

describe('ticketRoute', () => {
  it('opens a board ticket over the kanban tab', () => {
    expect(ticketRoute(5, 13, false)).toEqual([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 5, AppRoutes.KANBAN, AppRoutes.TICKETS, 13]);
  });

  it('opens a backlog ticket over the list tab', () => {
    expect(ticketRoute(5, 13, true)).toEqual([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 5, AppRoutes.LIST, AppRoutes.TICKETS, 13]);
  });
});

describe('boardRoute', () => {
  it('opens a board on its kanban tab', () => {
    expect(boardRoute(5)).toEqual([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 5, AppRoutes.KANBAN]);
  });
});
