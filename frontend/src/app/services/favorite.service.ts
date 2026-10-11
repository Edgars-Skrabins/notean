import {Injectable} from '@angular/core';
import {BehaviorSubject, combineLatest, map, Observable} from 'rxjs';
import {moveItemInArray} from '@angular/cdk/drag-drop';
import {axiosInstance} from "@config/axiosConfig";
import {PHRASES} from "@config/phrases";
import {apiRequest} from "@utils/apiRequest";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {ToastType} from "@models/toast.model";
import {
  DeleteFavoriteResponse,
  FavoritableType,
  Favorite,
  FavoriteResponse,
  FavoriteSurface,
  ListFavoritesResponse,
} from "@models/favorite.model";
import {teamPath} from "@utils/teamPath";

interface RawFavorite {
  id: number;
  favoritable_type: FavoritableType;
  favoritable_id: number;
  title: string;
  project_id: number | null;
  board_id?: number;
  board_title?: string;
  in_backlog?: boolean;
  home_position: number;
  sidebar_position: number;
}

export function mapFavorite(raw: RawFavorite): Favorite {
  return {
    id: raw.id,
    favoritableType: raw.favoritable_type,
    favoritableId: raw.favoritable_id,
    title: raw.title,
    projectId: raw.project_id,
    boardId: raw.board_id ?? null,
    boardTitle: raw.board_title ?? null,
    inBacklog: raw.in_backlog ?? false,
    homePosition: raw.home_position,
    sidebarPosition: raw.sidebar_position,
  };
}

function inProject(favorites: Favorite[], projectId: number | null): Favorite[] {
  return projectId === null ? favorites : favorites.filter((favorite) => favorite.projectId === projectId);
}

function sortBySurface(favorites: Favorite[], surface: FavoriteSurface): Favorite[] {
  const key = surface === 'home' ? 'homePosition' : 'sidebarPosition';
  return [...favorites].sort((a, b) => a[key] - b[key]);
}

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private favoritesSubject = new BehaviorSubject<Favorite[]>([]);
  private loadedTeamCode: string | null = null;
  private nextPendingId = -1;

  readonly favorites$: Observable<Favorite[]> = this.favoritesSubject.asObservable();
  readonly homeFavorites$: Observable<Favorite[]>;
  readonly sidebarFavorites$: Observable<Favorite[]>;

  constructor(
    private teamService: TeamService,
    private toastService: ToastService,
    private projectFilterService: ProjectFilterService
  ) {
    const selected$ = combineLatest([this.favorites$, this.projectFilterService.selectedProjectId$]);
    this.homeFavorites$ = selected$.pipe(map(([favorites, projectId]) => sortBySurface(inProject(favorites, projectId), 'home')));
    this.sidebarFavorites$ = selected$.pipe(map(([favorites, projectId]) => sortBySurface(inProject(favorites, projectId), 'sidebar')));
  }

  async load(): Promise<ListFavoritesResponse> {
    const teamCode = this.teamService.getCurrentTeam()?.code ?? null;

    if (teamCode !== this.loadedTeamCode) {
      this.loadedTeamCode = teamCode;
      this.favoritesSubject.next([]);
    }

    if (!teamCode) {
      return {success: false, code: 'TEAM_NOT_FOUND'};
    }

    return apiRequest<ListFavoritesResponse>(
      axiosInstance.get(this.favoritesUrl(teamCode)),
      (data) => {
        const favorites = (data.favorites as RawFavorite[]).map(mapFavorite);
        if (this.loadedTeamCode === teamCode) {
          this.favoritesSubject.next(favorites);
        }
        return {success: true, favorites};
      },
    );
  }

  isFavorited(type: FavoritableType, id: number): boolean {
    return this.favoriteFor(type, id) !== null;
  }

  favoriteFor(type: FavoritableType, id: number): Favorite | null {
    return this.favoritesSubject.value.find((favorite) => favorite.favoritableType === type && favorite.favoritableId === id) ?? null;
  }

  async toggle(type: FavoritableType, id: number, title: string): Promise<void> {
    const teamCode = this.loadedTeamCode;
    if (!teamCode) {
      return;
    }

    const previous = this.favoritesSubject.value;
    const existing = this.favoriteFor(type, id);

    if (existing && existing.id < 0) {
      return;
    }

    if (existing) {
      this.favoritesSubject.next(previous.filter((favorite) => favorite.id !== existing.id));

      const response = await this.deleteFavorite(teamCode, existing.id);
      if (!response.success) {
        this.revert(previous);
      }
      return;
    }

    const pending: Favorite = {
      id: this.nextPendingId--,
      favoritableType: type,
      favoritableId: id,
      title,
      projectId: null,
      boardId: null,
      boardTitle: null,
      inBacklog: false,
      homePosition: Math.min(0, ...previous.map((favorite) => favorite.homePosition)) - 1,
      sidebarPosition: Math.min(0, ...previous.map((favorite) => favorite.sidebarPosition)) - 1,
    };
    this.favoritesSubject.next([pending, ...previous]);

    const response = await this.createFavorite(teamCode, type, id);
    if (!response.success) {
      this.revert(previous);
      return;
    }

    this.favoritesSubject.next(this.favoritesSubject.value.map((favorite) => favorite.id === pending.id ? response.favorite : favorite));
  }

  async move(surface: FavoriteSurface, favoriteId: number, index: number): Promise<void> {
    const teamCode = this.loadedTeamCode;
    if (!teamCode) {
      return;
    }

    const previous = this.favoritesSubject.value;
    const ordered = sortBySurface(previous, surface);
    const visible = inProject(ordered, this.projectFilterService.getSelectedProjectId());
    const fromIndex = ordered.findIndex((favorite) => favorite.id === favoriteId);
    const target = visible[index];
    const toIndex = target ? ordered.indexOf(target) : -1;

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex || favoriteId < 0) {
      return;
    }

    moveItemInArray(ordered, fromIndex, toIndex);
    const positions = new Map(ordered.map((favorite, position) => [favorite.id, position]));
    const key = surface === 'home' ? 'homePosition' : 'sidebarPosition';
    this.favoritesSubject.next(previous.map((favorite) => ({...favorite, [key]: positions.get(favorite.id)!})));

    const response = await this.moveFavorite(teamCode, favoriteId, surface, toIndex);
    if (!response.success) {
      this.revert(previous);
    }
  }

  forgetItem(type: FavoritableType, id: number) {
    this.favoritesSubject.next(this.favoritesSubject.value.filter((favorite) => {
      const isItem = favorite.favoritableType === type && favorite.favoritableId === id;
      const isTicketOnBoard = type === 'Board' && favorite.favoritableType === 'Ticket' && favorite.boardId === id;
      return !isItem && !isTicketOnBoard;
    }));
  }

  renameItem(type: FavoritableType, id: number, title: string) {
    this.favoritesSubject.next(this.favoritesSubject.value.map((favorite) => {
      if (favorite.favoritableType === type && favorite.favoritableId === id) {
        return {...favorite, title};
      }
      if (type === 'Board' && favorite.favoritableType === 'Ticket' && favorite.boardId === id) {
        return {...favorite, boardTitle: title};
      }
      return favorite;
    }));
  }

  private revert(previous: Favorite[]) {
    this.favoritesSubject.next(previous);
    this.toastService.show({type: ToastType.ERROR, message: PHRASES.FAVORITE_UPDATE_FAILED});
  }

  private favoritesUrl(teamCode: string) {
    return teamPath(teamCode, 'favorites');
  }

  private async createFavorite(teamCode: string, type: FavoritableType, id: number): Promise<FavoriteResponse> {
    return apiRequest<FavoriteResponse>(
      axiosInstance.post(this.favoritesUrl(teamCode), {favorite: {favoritable_type: type, favoritable_id: id}}),
      (data) => ({success: true, favorite: mapFavorite(data.favorite)}),
    );
  }

  private async moveFavorite(teamCode: string, id: number, surface: FavoriteSurface, position: number): Promise<FavoriteResponse> {
    return apiRequest<FavoriteResponse>(
      axiosInstance.patch(`${this.favoritesUrl(teamCode)}/${id}`, {favorite: {surface, position}}),
      (data) => ({success: true, favorite: mapFavorite(data.favorite)}),
    );
  }

  private async deleteFavorite(teamCode: string, id: number): Promise<DeleteFavoriteResponse> {
    return apiRequest<DeleteFavoriteResponse>(
      axiosInstance.delete(`${this.favoritesUrl(teamCode)}/${id}`),
      () => ({success: true}),
    );
  }
}
