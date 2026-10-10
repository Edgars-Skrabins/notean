import {IconName} from "@components/icon/icon.component";
import {FavoritableType} from "@models/favorite.model";

export function favoriteTypeIcon(type: FavoritableType): IconName {
  switch (type) {
    case 'Page':
    case 'Diagram':
      return 'edit';
    case 'Board':
      return 'menu';
    case 'Card':
      return 'flow-process';
  }
}
