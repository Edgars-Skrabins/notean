import {Result} from "@models/result.model";
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
}

export type ListFolderedItemsResponse = Result<{ items: FolderedItemSummary[] }, TeamAccessErrorCode | ProjectsErrorCode>;

export type FolderedItemResponse<E extends ErrorCode> = Result<{ item: FolderedItemDetail }, TeamAccessErrorCode | ProjectsErrorCode | FoldersErrorCode | E>;

export type DeleteFolderedItemResponse<E extends ErrorCode> = Result<object, TeamAccessErrorCode | E>;
