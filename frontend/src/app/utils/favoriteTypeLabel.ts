import {PHRASES} from "@config/phrases";
import {FavoritableType} from "@models/favorite.model";

export function favoriteTypeLabel(type: FavoritableType): string {
  switch (type) {
    case 'Page':
      return PHRASES.ITEM_TYPE_PAGE;
    case 'Diagram':
      return PHRASES.ITEM_TYPE_DIAGRAM;
    case 'Board':
      return PHRASES.ITEM_TYPE_BOARD;
    case 'Ticket':
      return PHRASES.ITEM_TYPE_TICKET;
  }
}
