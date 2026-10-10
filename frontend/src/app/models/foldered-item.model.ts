import {Result} from "@models/result.model";
import {ErrorCode, TeamAccessErrorCode} from "@config/errorCodes";
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
  creator: FolderedItemUser;
  createdAt: string;
  updatedAt: string;
}

export interface FolderedItemDetail extends FolderedItemSummary {
  content: string;
  contributors: FolderedItemUser[];
  currentlyEditing: FolderedItemEditingUser | null;
}

export interface SaveFolderedItemParams {
  title: string;
  content: string;
}

export type ListFolderedItemsResponse = Result<{ items: FolderedItemSummary[] }, TeamAccessErrorCode>;

export type FolderedItemResponse<E extends ErrorCode> = Result<{ item: FolderedItemDetail }, TeamAccessErrorCode | E>;

export type DeleteFolderedItemResponse<E extends ErrorCode> = Result<object, TeamAccessErrorCode | E>;
