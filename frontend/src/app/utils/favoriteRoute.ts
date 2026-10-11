import {Favorite} from "@models/favorite.model";
import {AppRoutes} from "../app/app-routes.enum";
import {boardRoute, ticketRoute} from "@utils/ticketRoute";

export function favoriteRoute(favorite: Favorite): (string | number)[] {
  switch (favorite.favoritableType) {
    case 'Page':
      return [AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, favorite.favoritableId];
    case 'Diagram':
      return [AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, favorite.favoritableId];
    case 'Board':
      return boardRoute(favorite.favoritableId);
    case 'Ticket':
      return ticketRoute(favorite.boardId!, favorite.favoritableId, favorite.inBacklog);
  }
}
