import { Injectable } from '@angular/core';
import { axiosInstance } from '@config/axiosConfig';
import { apiRequest } from '@utils/apiRequest';
import {
  DeleteFolderResponse,
  FolderDeleteMode,
  FolderItemType,
  FolderResponse,
  FolderSummary,
  FolderUser,
  ListFoldersResponse,
} from '@models/folder.model';
import { teamPath } from '@utils/teamPath';
import { projectQuery } from '@utils/projectQuery';

interface RawFolderUser {
  id: number;
  nickname: string;
}

interface RawFolderSummary {
  id: number;
  title: string;
  parent_id: number | null;
  creator: RawFolderUser;
  created_at: string;
  updated_at: string;
}

export function mapFolderUser(raw: RawFolderUser): FolderUser {
  return {
    id: raw.id,
    nickname: raw.nickname,
  };
}

export function mapFolderSummary(raw: RawFolderSummary): FolderSummary {
  return {
    id: raw.id,
    title: raw.title,
    parentId: raw.parent_id,
    creator: mapFolderUser(raw.creator),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

@Injectable({
  providedIn: 'root',
})
export class FolderService {
  private foldersUrl(teamCode: string): string {
    return teamPath(teamCode, 'folders');
  }

  async listFolders(teamCode: string, itemType: FolderItemType, projectId: number | null = null): Promise<ListFoldersResponse> {
    return apiRequest<ListFoldersResponse>(
      axiosInstance.get(this.foldersUrl(teamCode), {params: {item_type: itemType, ...projectQuery(projectId)?.params}}),
      (data) => ({success: true, folders: (data.folders as RawFolderSummary[]).map(mapFolderSummary)}),
    );
  }

  async createFolder(teamCode: string, itemType: FolderItemType, title: string, parentId: number | null = null): Promise<FolderResponse> {
    return apiRequest<FolderResponse>(
      axiosInstance.post(this.foldersUrl(teamCode), {folder: {title, item_type: itemType, parent_id: parentId}}),
      (data) => ({success: true, folder: mapFolderSummary(data.folder)}),
    );
  }

  async renameFolder(teamCode: string, id: number, title: string): Promise<FolderResponse> {
    return this.updateFolder(teamCode, id, {title});
  }

  async moveFolder(teamCode: string, id: number, parentId: number | null): Promise<FolderResponse> {
    return this.updateFolder(teamCode, id, {parent_id: parentId});
  }

  async deleteFolder(teamCode: string, id: number, mode: FolderDeleteMode): Promise<DeleteFolderResponse> {
    return apiRequest<DeleteFolderResponse>(
      axiosInstance.delete(`${this.foldersUrl(teamCode)}/${id}`, {params: {mode}}),
      () => ({success: true}),
    );
  }

  private updateFolder(teamCode: string, id: number, changes: { title?: string; parent_id?: number | null }): Promise<FolderResponse> {
    return apiRequest<FolderResponse>(
      axiosInstance.patch(`${this.foldersUrl(teamCode)}/${id}`, {folder: changes}),
      (data) => ({success: true, folder: mapFolderSummary(data.folder)}),
    );
  }
}
