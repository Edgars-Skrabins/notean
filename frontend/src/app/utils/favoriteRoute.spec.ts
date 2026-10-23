import {favoriteRoute} from "./favoriteRoute";
import {Favorite} from "@models/favorite.model";
import {AppRoutes} from "../app/app-routes.enum";

function buildFavorite(overrides: Partial<Favorite>): Favorite {
  return {
    id: 1,
    favoritableType: 'Page',
    favoritableId: 10,
    title: 'Notes',
    projectId: null,
    boardId: null,
    boardTitle: null,
    inBacklog: false,
    homePosition: 0,
    sidebarPosition: 0,
    ...overrides,
  };
}

describe('favoriteRoute', () => {
  it('routes a page to its detail view', () => {
    expect(favoriteRoute(buildFavorite({favoritableType: 'Page', favoritableId: 10})))
      .toEqual([AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, 10]);
  });

  it('routes a diagram to its detail view', () => {
    expect(favoriteRoute(buildFavorite({favoritableType: 'Diagram', favoritableId: 11})))
      .toEqual([AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, 11]);
  });

  it('routes a board to its kanban tab', () => {
    expect(favoriteRoute(buildFavorite({favoritableType: 'Board', favoritableId: 12})))
      .toEqual([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 12, AppRoutes.KANBAN]);
  });

  it('routes a ticket on the board to its popup over the kanban tab', () => {
    expect(favoriteRoute(buildFavorite({favoritableType: 'Ticket', favoritableId: 13, boardId: 5})))
      .toEqual([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 5, AppRoutes.KANBAN, AppRoutes.TICKETS, 13]);
  });

  it('routes a backlog ticket to its popup over the backlog tab', () => {
    expect(favoriteRoute(buildFavorite({favoritableType: 'Ticket', favoritableId: 13, boardId: 5, inBacklog: true})))
      .toEqual([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 5, AppRoutes.LIST, AppRoutes.TICKETS, 13]);
  });
});
