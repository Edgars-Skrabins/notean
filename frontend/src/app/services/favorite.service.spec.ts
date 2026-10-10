import {firstValueFrom} from "rxjs";
import {AxiosError} from "axios";
import {FavoriteService, mapFavorite} from "./favorite.service";
import {axiosInstance} from "@config/axiosConfig";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {Favorite} from "@models/favorite.model";
import {PHRASES} from "@config/phrases";

function rawFavorite(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    favoritable_type: 'Page',
    favoritable_id: 10,
    title: 'Notes',
    home_position: 0,
    sidebar_position: 0,
    ...overrides,
  };
}

describe('mapFavorite', () => {
  it('maps snake_case fields and defaults board fields to null', () => {
    expect(mapFavorite(rawFavorite() as never)).toEqual({
      id: 1,
      favoritableType: 'Page',
      favoritableId: 10,
      title: 'Notes',
      boardId: null,
      boardTitle: null,
      homePosition: 0,
      sidebarPosition: 0,
    });
  });

  it('maps board fields for a card', () => {
    const result = mapFavorite(rawFavorite({favoritable_type: 'Card', board_id: 5, board_title: 'Sprint 12'}) as never);

    expect(result.boardId).toBe(5);
    expect(result.boardTitle).toBe('Sprint 12');
  });
});

describe('FavoriteService', () => {
  let service: FavoriteService;
  let toastService: jasmine.SpyObj<ToastService>;

  async function loadWith(favorites: ReturnType<typeof rawFavorite>[]) {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {favorites}}));
    await service.load();
    get.calls.reset();
  }

  function current(): Favorite[] {
    let value: Favorite[] = [];
    service.favorites$.subscribe((favorites) => value = favorites).unsubscribe();
    return value;
  }

  beforeEach(() => {
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeam']);
    teamService.getCurrentTeam.and.returnValue({id: 1, name: 'Team A', code: 'aaa'});
    toastService = jasmine.createSpyObj('ToastService', ['show']);
    service = new FavoriteService(teamService, toastService);
  });

  it('loads the current team favorites', async () => {
    await loadWith([rawFavorite()]);

    expect(service.isFavorited('Page', 10)).toBeTrue();
    expect(service.isFavorited('Page', 11)).toBeFalse();
  });

  it('adds a favorite optimistically and keeps the saved one on success', async () => {
    await loadWith([]);
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({
      data: {favorite: rawFavorite({id: 7, favoritable_type: 'Board', favoritable_id: 3, title: 'Sprint 12', home_position: -1, sidebar_position: -1})}
    }));

    const pending = service.toggle('Board', 3, 'Sprint 12');

    expect(service.isFavorited('Board', 3)).toBeTrue();
    await pending;
    expect(post).toHaveBeenCalledWith('/teams/aaa/favorites', {favorite: {favoritable_type: 'Board', favoritable_id: 3}});
    expect(service.favoriteFor('Board', 3)?.id).toBe(7);
    expect(toastService.show).not.toHaveBeenCalled();
  });

  it('reverts and shows a toast when adding fails', async () => {
    await loadWith([]);
    spyOn(axiosInstance, 'post').and.returnValue(Promise.reject(new AxiosError('failed')));

    await service.toggle('Board', 3, 'Sprint 12');

    expect(service.isFavorited('Board', 3)).toBeFalse();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.FAVORITE_UPDATE_FAILED});
  });

  it('removes by favorite id', async () => {
    await loadWith([rawFavorite({id: 42})]);
    const remove = spyOn(axiosInstance, 'delete').and.returnValue(Promise.resolve({}));

    await service.toggle('Page', 10, 'Notes');

    expect(remove).toHaveBeenCalledWith('/teams/aaa/favorites/42');
    expect(service.isFavorited('Page', 10)).toBeFalse();
  });

  it('restores the favorite and shows a toast when removing fails', async () => {
    await loadWith([rawFavorite({id: 42})]);
    spyOn(axiosInstance, 'delete').and.returnValue(Promise.reject(new AxiosError('failed')));

    await service.toggle('Page', 10, 'Notes');

    expect(service.isFavorited('Page', 10)).toBeTrue();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.FAVORITE_UPDATE_FAILED});
  });

  it('moves within one surface only and sends the target index', async () => {
    await loadWith([
      rawFavorite({id: 1, favoritable_id: 10, home_position: 0, sidebar_position: 2}),
      rawFavorite({id: 2, favoritable_id: 11, home_position: 1, sidebar_position: 1}),
      rawFavorite({id: 3, favoritable_id: 12, home_position: 2, sidebar_position: 0}),
    ]);
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {favorite: rawFavorite({id: 3})}}));

    await service.move('home', 3, 0);

    expect(patch).toHaveBeenCalledWith('/teams/aaa/favorites/3', {favorite: {surface: 'home', position: 0}});
    expect((await firstValueFrom(service.homeFavorites$)).map((f) => f.id)).toEqual([3, 1, 2]);
    expect((await firstValueFrom(service.sidebarFavorites$)).map((f) => f.id)).toEqual([3, 2, 1]);
  });

  it('reverts the order and shows a toast when moving fails', async () => {
    await loadWith([
      rawFavorite({id: 1, favoritable_id: 10, home_position: 0}),
      rawFavorite({id: 2, favoritable_id: 11, home_position: 1}),
    ]);
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(new AxiosError('failed')));

    await service.move('home', 2, 0);

    expect((await firstValueFrom(service.homeFavorites$)).map((f) => f.id)).toEqual([1, 2]);
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.FAVORITE_UPDATE_FAILED});
  });

  it('forgetItem removes the item and, for a board, the cards on it', async () => {
    await loadWith([
      rawFavorite({id: 1, favoritable_type: 'Board', favoritable_id: 5}),
      rawFavorite({id: 2, favoritable_type: 'Card', favoritable_id: 100, board_id: 5, board_title: 'Sprint 12'}),
      rawFavorite({id: 3, favoritable_type: 'Page', favoritable_id: 10}),
    ]);

    service.forgetItem('Board', 5);

    expect(current().map((f) => f.id)).toEqual([3]);
  });

  it('renameItem updates the title and, for a board, its cards board title', async () => {
    await loadWith([
      rawFavorite({id: 1, favoritable_type: 'Board', favoritable_id: 5, title: 'Sprint 12'}),
      rawFavorite({id: 2, favoritable_type: 'Card', favoritable_id: 100, board_id: 5, board_title: 'Sprint 12'}),
    ]);

    service.renameItem('Board', 5, 'Sprint 13');

    expect(service.favoriteFor('Board', 5)?.title).toBe('Sprint 13');
    expect(service.favoriteFor('Card', 100)?.boardTitle).toBe('Sprint 13');
  });

  it('derives each surface order from its own position', async () => {
    await loadWith([
      rawFavorite({id: 1, favoritable_id: 10, home_position: 1, sidebar_position: 0}),
      rawFavorite({id: 2, favoritable_id: 11, home_position: 0, sidebar_position: 1}),
    ]);

    expect((await firstValueFrom(service.homeFavorites$)).map((f) => f.id)).toEqual([2, 1]);
    expect((await firstValueFrom(service.sidebarFavorites$)).map((f) => f.id)).toEqual([1, 2]);
  });
});
