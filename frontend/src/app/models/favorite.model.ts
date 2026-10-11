import {Result} from "@models/result.model";
import {FavoritesErrorCode, TeamAccessErrorCode} from "@config/errorCodes";

export type FavoritableType = 'Page' | 'Diagram' | 'Board' | 'Ticket';

export type FavoriteSurface = 'home' | 'sidebar';

export interface Favorite {
  id: number;
  favoritableType: FavoritableType;
  favoritableId: number;
  title: string;
  boardId: number | null;
  boardTitle: string | null;
  inBacklog: boolean;
  homePosition: number;
  sidebarPosition: number;
}

export type ListFavoritesResponse = Result<{ favorites: Favorite[] }, TeamAccessErrorCode>;

export type FavoriteResponse = Result<{ favorite: Favorite }, TeamAccessErrorCode | FavoritesErrorCode>;

export type DeleteFavoriteResponse = Result<object, TeamAccessErrorCode | FavoritesErrorCode>;
