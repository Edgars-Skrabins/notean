import {Result} from "@models/result.model";
import {FoldersErrorCode, ProjectsErrorCode, TeamAccessErrorCode} from "@config/errorCodes";

export type FolderItemType = 'Page' | 'Diagram';

export interface FolderUser {
  id: number;
  nickname: string;
}

export interface FolderSummary {
  id: number;
  title: string;
  parentId: number | null;
  projectId: number | null;
  creator: FolderUser;
  createdAt: string;
  updatedAt: string;
}

export type FolderDeleteMode = 'cascade' | 'promote';

export type ListFoldersResponse = Result<{ folders: FolderSummary[] }, TeamAccessErrorCode | ProjectsErrorCode>;

export type FolderResponse = Result<{ folder: FolderSummary }, TeamAccessErrorCode | FoldersErrorCode | ProjectsErrorCode>;

export type DeleteFolderResponse = Result<{ trashEntryIds: number[] }, TeamAccessErrorCode | FoldersErrorCode>;
