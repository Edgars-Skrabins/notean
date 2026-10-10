import {favoriteRoute} from "./favoriteRoute";
import {Favorite} from "@models/favorite.model";
import {AppRoutes} from "../app/app-routes.enum";

function buildFavorite(overrides: Partial<Favorite>): Favorite {
  return {
    id: 1,
    favoritableType: 'Page',
    favoritableId: 10,
    title: 'Notes',
    boardId: null,
    boardTitle: null,
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

  it('routes a board to its board view', () => {
    expect(favoriteRoute(buildFavorite({favoritableType: 'Board', favoritableId: 12})))
      .toEqual([AppRoutes.DASHBOARD, AppRoutes.KANBAN_BOARDS, 12]);
  });

  it('routes a card to its card view on its board', () => {
    expect(favoriteRoute(buildFavorite({favoritableType: 'Card', favoritableId: 13, boardId: 5})))
      .toEqual([AppRoutes.DASHBOARD, AppRoutes.KANBAN_BOARDS, 5, AppRoutes.CARDS, 13]);
  });
});
