import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {axiosInstance} from "@config/axiosConfig";
import {PHRASES} from "@config/phrases";
import {apiRequest} from "@utils/apiRequest";
import {errorPhrase} from "@utils/errorPhrase";
import {teamPath} from "@utils/teamPath";
import {mapBoardUser, RawBoardUser} from "@services/board.service";
import {FavoriteService} from "@services/favorite.service";
import {BoardListService} from "@services/board-list.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {
  DeleteTrashResponse,
  ListTrashParams,
  ListTrashResponse,
  RestoredItem,
  RestoreTrashResponse,
  TrashEntry,
  TrashItemType,
} from "@models/trash.model";

interface RawTrashEntry {
  id: number;
  item_type: TrashItemType;
  item_id: number;
  title: string;
  project_id: number | null;
  board: { id: number; title: string } | null;
  children_count: number;
  restorable: boolean;
  deleted_by: RawBoardUser;
  deleted_at: string;
  purge_at: string;
}

interface RawRestoredItem {
  item_type: TrashItemType;
  item_id: number;
}

export function mapTrashEntry(raw: RawTrashEntry): TrashEntry {
  return {
    id: raw.id,
    itemType: raw.item_type,
    itemId: raw.item_id,
    title: raw.title,
    projectId: raw.project_id,
    board: raw.board,
    childrenCount: raw.children_count,
    restorable: raw.restorable,
    deletedBy: mapBoardUser(raw.deleted_by),
    deletedAt: raw.deleted_at,
    purgeAt: raw.purge_at,
  };
}

@Injectable({
  providedIn: 'root',
})
export class TrashService {
  private restoredSubject = new Subject<RestoredItem[]>();

  readonly restored$: Observable<RestoredItem[]> = this.restoredSubject.asObservable();

  constructor(
    private favoriteService: FavoriteService,
    private boardListService: BoardListService,
    private toastService: ToastService
  ) {
  }

  notifyTrashed(teamCode: string, entryIds: number[]) {
    if (!entryIds.length) {
      return;
    }

    this.toastService.show({
      type: ToastType.SUCCESS,
      message: PHRASES.MOVED_TO_TRASH,
      action: {label: PHRASES.UNDO, run: () => this.undo(teamCode, entryIds)},
    });
  }

  async list(teamCode: string, {offset, type, search, projectId}: ListTrashParams = {}): Promise<ListTrashResponse> {
    const params = {
      offset: offset || undefined,
      type: type || undefined,
      search: search || undefined,
      project_id: projectId || undefined,
    };
    return apiRequest<ListTrashResponse>(
      axiosInstance.get(this.trashUrl(teamCode), {params}),
      (data) => ({
        success: true,
        entries: (data.trash_entries as RawTrashEntry[]).map(mapTrashEntry),
        hasMore: data.has_more,
      }),
    );
  }

  async restore(teamCode: string, entryIds: number[]): Promise<RestoreTrashResponse> {
    const response = await apiRequest<RestoreTrashResponse>(
      axiosInstance.post(this.trashUrl(teamCode, 'restore'), {trash: {entry_ids: entryIds}}),
      (data) => ({
        success: true,
        restored: (data.restored as RawRestoredItem[]).map((item): RestoredItem => ({itemType: item.item_type, itemId: item.item_id})),
      }),
    );
    if (response.success) {
      this.favoriteService.load();
      if (response.restored.some((item) => item.itemType === 'Board')) {
        this.boardListService.load();
      }
      this.restoredSubject.next(response.restored);
    }
    return response;
  }

  async deleteForever(teamCode: string, id: number): Promise<DeleteTrashResponse> {
    return apiRequest<DeleteTrashResponse>(
      axiosInstance.delete(this.trashUrl(teamCode, id)),
      () => ({success: true}),
    );
  }

  async empty(teamCode: string): Promise<DeleteTrashResponse> {
    return apiRequest<DeleteTrashResponse>(
      axiosInstance.delete(this.trashUrl(teamCode)),
      () => ({success: true}),
    );
  }

  private async undo(teamCode: string, entryIds: number[]) {
    const response = await this.restore(teamCode, entryIds);
    this.toastService.show(response.success
      ? {type: ToastType.SUCCESS, message: PHRASES.ITEM_RESTORED}
      : {type: ToastType.ERROR, message: errorPhrase(response.code)});
  }

  private trashUrl(teamCode: string, ...segments: (string | number)[]): string {
    return teamPath(teamCode, 'trash', ...segments);
  }
}
