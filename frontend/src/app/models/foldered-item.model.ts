import {EditConflict, Result} from "@models/result.model";
import {ErrorCode, FoldersErrorCode, ProjectsErrorCode, TeamAccessErrorCode} from "@config/errorCodes";
import {Avatar} from "@models/avatar.model";

export interface FolderedItemUser {
  id: number;
  nickname: string;
  avatar: Avatar;
}

export interface FolderedItemEditingUser {
  id: number;
  nickname: string;
}

export interface FolderedItemSummary {
  id: number;
  title: string;
  folderId: number | null;
  projectId: number | null;
  lockVersion: number;
  creator: FolderedItemUser;
  createdAt: string;
  updatedAt: string;
}

export interface FolderedItemDetail extends FolderedItemSummary {
  content: string;
  contributors: FolderedItemUser[];
  currentlyEditing: FolderedItemEditingUser | null;
}

export interface CreateFolderedItemParams {
  title: string;
  content: string;
  projectId: number | null;
  folderId: number | null;
}

export interface SaveFolderedItemParams {
  title: string;
  content: string;
  lockVersion: number;
}

export interface ListFolderedItemsParams {
  folderId?: number | 'root';
  search?: string;
  projectId?: number | null;
  offset?: number;
}

export type ListFolderedItemsResponse = Result<{ items: FolderedItemSummary[], hasMore: boolean }, TeamAccessErrorCode | ProjectsErrorCode | FoldersErrorCode>;

export type FolderedItemResponse<E extends ErrorCode> = Result<{ item: FolderedItemDetail }, TeamAccessErrorCode | ProjectsErrorCode | FoldersErrorCode | E>;

export type SaveFolderedItemResponse<E extends ErrorCode> = FolderedItemResponse<E> | EditConflict<FolderedItemDetail>;

export type DeleteFolderedItemResponse<E extends ErrorCode> = Result<object, TeamAccessErrorCode | E>;
