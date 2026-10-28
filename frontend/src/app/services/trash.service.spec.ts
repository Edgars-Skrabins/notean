import {AxiosError} from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {FavoriteService} from "@services/favorite.service";
import {BoardListService} from "@services/board-list.service";
import {ToastService} from "@services/toast.service";
import {ToastOptions, ToastType} from "@models/toast.model";
import {mapTrashEntry, TrashService} from "./trash.service";

const rawEntry = {
  id: 7,
  item_type: 'Ticket' as const,
  item_id: 3,
  title: 'Fix bug',
  project_id: null,
  board: {id: 2, title: 'Sprint'},
  children_count: 0,
  restorable: false,
  deleted_by: {id: 1, nickname: 'alice', avatar: {color: 'red' as const, image_url: null}},
  deleted_at: '2026-10-20T00:00:00Z',
  purge_at: '2026-11-03T00:00:00Z',
};

describe('mapTrashEntry', () => {
  it('maps the entry to camelCase', () => {
    expect(mapTrashEntry(rawEntry)).toEqual({
      id: 7,
      itemType: 'Ticket',
      itemId: 3,
      title: 'Fix bug',
      projectId: null,
      board: {id: 2, title: 'Sprint'},
      childrenCount: 0,
      restorable: false,
      deletedBy: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}},
      deletedAt: '2026-10-20T00:00:00Z',
      purgeAt: '2026-11-03T00:00:00Z',
    });
  });
});

describe('TrashService', () => {
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let boardListService: jasmine.SpyObj<BoardListService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let service: TrashService;

  beforeEach(() => {
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['load']);
    boardListService = jasmine.createSpyObj<BoardListService>('BoardListService', ['load']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    service = new TrashService(favoriteService, boardListService, toastService);
  });

  it('lists entries with only the filters that are set', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {trash_entries: [rawEntry], has_more: true}}));

    const response = await service.list('abc', {offset: 50, type: 'ticket', search: '', projectId: null});

    expect(get).toHaveBeenCalledWith('/teams/abc/trash', {params: {offset: 50, type: 'ticket', search: undefined, project_id: undefined}});
    expect(response.success && response.entries.map((entry) => entry.id)).toEqual([7]);
    expect(response.success && response.hasMore).toBeTrue();
  });

  it('restores entries and reloads favorites and boards when a board comes back', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {restored: [{item_type: 'Board', item_id: 2}]}}));

    const response = await service.restore('abc', [7]);

    expect(post).toHaveBeenCalledWith('/teams/abc/trash/restore', {trash: {entry_ids: [7]}});
    expect(response).toEqual({success: true, restored: [{itemType: 'Board', itemId: 2}]});
    expect(favoriteService.load).toHaveBeenCalled();
    expect(boardListService.load).toHaveBeenCalled();
  });

  it('offers an undo that restores the trashed entries and announces them', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {restored: [{item_type: 'Page', item_id: 4}]}}));
    const restored: unknown[] = [];
    service.restored$.subscribe((items) => restored.push(items));

    service.notifyTrashed('abc', [7, 8]);
    const toast = toastService.show.calls.mostRecent().args[0] as ToastOptions;
    toast.action!.run();
    await new Promise((resolve) => setTimeout(resolve));

    expect(toast.type).toBe(ToastType.SUCCESS);
    expect(post).toHaveBeenCalledWith('/teams/abc/trash/restore', {trash: {entry_ids: [7, 8]}});
    expect(restored).toEqual([[{itemType: 'Page', itemId: 4}]]);
    expect(toastService.show.calls.mostRecent().args[0].message).toBe('ITEM_RESTORED');
  });

  it('shows nothing when a delete trashed nothing', () => {
    service.notifyTrashed('abc', []);

    expect(toastService.show).not.toHaveBeenCalled();
  });

  it('returns the error code and reloads nothing when a restore fails', async () => {
    const error = new AxiosError('Unprocessable', '422', undefined, undefined, {status: 422, data: {code: 'TRASH_BOARD_IN_TRASH'}} as never);
    spyOn(axiosInstance, 'post').and.returnValue(Promise.reject(error));

    const response = await service.restore('abc', [7]);

    expect(response).toEqual({success: false, code: 'TRASH_BOARD_IN_TRASH'});
    expect(favoriteService.load).not.toHaveBeenCalled();
  });
});
