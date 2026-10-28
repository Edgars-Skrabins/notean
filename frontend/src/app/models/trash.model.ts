import {Result} from "@models/result.model";
import {BoardUser} from "@models/board.model";
import {ProjectsErrorCode, TeamAccessErrorCode, TrashErrorCode} from "@config/errorCodes";

export type TrashItemType = 'Page' | 'Diagram' | 'Board' | 'Ticket' | 'Folder' | 'ChatChannel';

export type TrashTypeFilter = 'page' | 'diagram' | 'board' | 'ticket' | 'folder' | 'chat_channel';

export interface TrashEntry {
  id: number;
  itemType: TrashItemType;
  itemId: number;
  title: string;
  projectId: number | null;
  board: { id: number; title: string } | null;
  childrenCount: number;
  restorable: boolean;
  deletedBy: BoardUser;
  deletedAt: string;
  purgeAt: string;
}

export interface RestoredItem {
  itemType: TrashItemType;
  itemId: number;
}

export interface ListTrashParams {
  offset?: number;
  type?: TrashTypeFilter | null;
  search?: string;
  projectId?: number | null;
}

export type ListTrashResponse = Result<{ entries: TrashEntry[]; hasMore: boolean }, TeamAccessErrorCode | ProjectsErrorCode>;

export type RestoreTrashResponse = Result<{ restored: RestoredItem[] }, TeamAccessErrorCode | TrashErrorCode>;

export type DeleteTrashResponse = Result<object, TeamAccessErrorCode | TrashErrorCode>;
