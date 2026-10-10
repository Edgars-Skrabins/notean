export type FavoritableType = 'Page' | 'Diagram' | 'Board' | 'Card';

export type FavoriteSurface = 'home' | 'sidebar';

export interface Favorite {
  id: number;
  favoritableType: FavoritableType;
  favoritableId: number;
  title: string;
  boardId: number | null;
  boardTitle: string | null;
  homePosition: number;
  sidebarPosition: number;
}

export type ListFavoritesResponse =
  | { success: true; favorites: Favorite[] }
  | { success: false; statusMessage: string };

export type FavoriteResponse =
  | { success: true; favorite: Favorite }
  | { success: false; statusMessage: string };

export type DeleteFavoriteResponse =
  | { success: true }
  | { success: false; statusMessage: string };
