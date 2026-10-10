import {Favorite} from "@models/favorite.model";
import {AppRoutes} from "../app/app-routes.enum";

export function favoriteRoute(favorite: Favorite): (string | number)[] {
  switch (favorite.favoritableType) {
    case 'Page':
      return [AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, favorite.favoritableId];
    case 'Diagram':
      return [AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, favorite.favoritableId];
    case 'Board':
      return [AppRoutes.DASHBOARD, AppRoutes.KANBAN_BOARDS, favorite.favoritableId];
    case 'Card':
      return [AppRoutes.DASHBOARD, AppRoutes.KANBAN_BOARDS, favorite.boardId!, AppRoutes.CARDS, favorite.favoritableId];
  }
}
