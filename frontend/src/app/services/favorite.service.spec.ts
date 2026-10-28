import {BehaviorSubject, firstValueFrom} from "rxjs";
import {AxiosError} from "axios";
import {FavoriteService, mapFavorite} from "./favorite.service";
import {axiosInstance} from "@config/axiosConfig";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {ToastType} from "@models/toast.model";
import {Favorite} from "@models/favorite.model";
import {TeamFeatures} from "@models/team.model";
import {PHRASES} from "@config/phrases";
import {testTeam} from "../testing/teamFixtures";

function rawFavorite(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    favoritable_type: 'Page',
    favoritable_id: 10,
    title: 'Notes',
    project_id: null,
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
      projectId: null,
      boardId: null,
      boardTitle: null,
      inBacklog: false,
      homePosition: 0,
      sidebarPosition: 0,
    });
  });

  it('maps board fields for a ticket', () => {
    const result = mapFavorite(rawFavorite({favoritable_type: 'Ticket', board_id: 5, board_title: 'Sprint 12'}) as never);

    expect(result.boardId).toBe(5);
    expect(result.boardTitle).toBe('Sprint 12');
  });
});

describe('FavoriteService', () => {
  let service: FavoriteService;
  let toastService: jasmine.SpyObj<ToastService>;
  let selectedProject: BehaviorSubject<number | null>;
  let features: BehaviorSubject<TeamFeatures>;

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
    features = new BehaviorSubject<TeamFeatures>({pages: true, diagrams: true, boards: true, chat: true});
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeam', 'isFeatureEnabled'], {features$: features});
    teamService.isFeatureEnabled.and.callFake((feature) => features.value[feature]);
    teamService.getCurrentTeam.and.returnValue(testTeam({id: 1, name: 'Team A', code: 'aaa'}));
    toastService = jasmine.createSpyObj('ToastService', ['show']);
    selectedProject = new BehaviorSubject<number | null>(null);
    const projectFilterService = {
      selectedProjectId$: selectedProject,
      getSelectedProjectId: () => selectedProject.value,
    } as unknown as ProjectFilterService;
    service = new FavoriteService(teamService, toastService, projectFilterService);
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

  it('forgetItem removes the item and, for a board, the tickets on it', async () => {
    await loadWith([
      rawFavorite({id: 1, favoritable_type: 'Board', favoritable_id: 5}),
      rawFavorite({id: 2, favoritable_type: 'Ticket', favoritable_id: 100, board_id: 5, board_title: 'Sprint 12'}),
      rawFavorite({id: 3, favoritable_type: 'Page', favoritable_id: 10}),
    ]);

    service.forgetItem('Board', 5);

    expect(current().map((f) => f.id)).toEqual([3]);
  });

  it('renameItem updates the title and, for a board, its tickets board title', async () => {
    await loadWith([
      rawFavorite({id: 1, favoritable_type: 'Board', favoritable_id: 5, title: 'Sprint 12'}),
      rawFavorite({id: 2, favoritable_type: 'Ticket', favoritable_id: 100, board_id: 5, board_title: 'Sprint 12'}),
    ]);

    service.renameItem('Board', 5, 'Sprint 13');

    expect(service.favoriteFor('Board', 5)?.title).toBe('Sprint 13');
    expect(service.favoriteFor('Ticket', 100)?.boardTitle).toBe('Sprint 13');
  });

  it('derives each surface order from its own position', async () => {
    await loadWith([
      rawFavorite({id: 1, favoritable_id: 10, home_position: 1, sidebar_position: 0}),
      rawFavorite({id: 2, favoritable_id: 11, home_position: 0, sidebar_position: 1}),
    ]);

    expect((await firstValueFrom(service.homeFavorites$)).map((f) => f.id)).toEqual([2, 1]);
    expect((await firstValueFrom(service.sidebarFavorites$)).map((f) => f.id)).toEqual([1, 2]);
  });

  it('shows only the selected project\'s favorites on Home and in the sidebar', async () => {
    await loadWith([rawFavorite({id: 1, project_id: 4}), rawFavorite({id: 2, favoritable_id: 11, project_id: null, home_position: 1, sidebar_position: 1})]);

    expect((await firstValueFrom(service.homeFavorites$)).map((favorite) => favorite.id)).toEqual([1, 2]);

    selectedProject.next(4);

    expect((await firstValueFrom(service.homeFavorites$)).map((favorite) => favorite.id)).toEqual([1]);
    expect((await firstValueFrom(service.sidebarFavorites$)).map((favorite) => favorite.id)).toEqual([1]);
    expect(service.isFavorited('Page', 11)).toBeTrue();
  });

  it('leaves out favorites of turned-off features, tickets following boards', async () => {
    await loadWith([
      rawFavorite({id: 1, favoritable_type: 'Page', favoritable_id: 10, home_position: 0, sidebar_position: 0}),
      rawFavorite({id: 2, favoritable_type: 'Board', favoritable_id: 11, home_position: 1, sidebar_position: 1}),
      rawFavorite({id: 3, favoritable_type: 'Ticket', favoritable_id: 12, home_position: 2, sidebar_position: 2}),
    ]);

    features.next({pages: true, diagrams: true, boards: false, chat: true});

    expect((await firstValueFrom(service.homeFavorites$)).map((favorite) => favorite.id)).toEqual([1]);
    expect((await firstValueFrom(service.sidebarFavorites$)).map((favorite) => favorite.id)).toEqual([1]);

    features.next({pages: true, diagrams: true, boards: true, chat: true});

    expect((await firstValueFrom(service.homeFavorites$)).map((favorite) => favorite.id)).toEqual([1, 2, 3]);
  });

  it('maps a move inside a filtered list onto the full order', async () => {
    await loadWith([
      rawFavorite({id: 1, favoritable_id: 10, project_id: 4, home_position: 0}),
      rawFavorite({id: 2, favoritable_id: 11, project_id: null, home_position: 1}),
      rawFavorite({id: 3, favoritable_id: 12, project_id: 4, home_position: 2}),
    ]);
    selectedProject.next(4);
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {favorite: rawFavorite({id: 3})}}));

    await service.move('home', 3, 0);

    expect(patch).toHaveBeenCalledWith('/teams/aaa/favorites/3', {favorite: {surface: 'home', position: 0}});
    selectedProject.next(null);
    expect((await firstValueFrom(service.homeFavorites$)).map((favorite) => favorite.id)).toEqual([3, 1, 2]);
  });
});
