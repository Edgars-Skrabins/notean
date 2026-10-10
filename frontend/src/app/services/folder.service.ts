import { Injectable } from '@angular/core';
import { axiosInstance } from '@config/axiosConfig';
import { toErrorResult } from '@utils/httpError';
import {
  DeleteFolderResponse,
  FolderItemType,
  FolderResponse,
  FolderSummary,
  FolderUser,
  ListFoldersResponse,
} from '@models/folder.model';

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
    return `/teams/${teamCode}/folders`;
  }

  async listFolders(
    teamCode: string,
    itemType: FolderItemType,
  ): Promise<ListFoldersResponse> {
    return axiosInstance
      .get(this.foldersUrl(teamCode), { params: { item_type: itemType } })
      .then((response) => {
        const folders = (response.data.folders ?? response.data) as RawFolderSummary[];

        return {
          success: true,
          folders: folders.map(mapFolderSummary),
        } satisfies ListFoldersResponse;
      })
      .catch((error) => toErrorResult<ListFoldersResponse>(error, 'Failed to load folders'));
  }

  async createFolder(
    teamCode: string,
    itemType: FolderItemType,
    title: string,
    parentId: number | null = null,
  ): Promise<FolderResponse> {
    return axiosInstance
      .post(this.foldersUrl(teamCode), {
        folder: { title, item_type: itemType, parent_id: parentId },
      })
      .then((response) => ({
        success: true,
        folder: mapFolderSummary(response.data.folder),
      } satisfies FolderResponse))
      .catch((error) => toErrorResult<FolderResponse>(error, 'Failed to create folder'));
  }

  async renameFolder(
    teamCode: string,
    id: number,
    title: string,
  ): Promise<FolderResponse> {
    return axiosInstance
      .patch(`${this.foldersUrl(teamCode)}/${id}`, {
        folder: { title },
      })
      .then((response) => ({
        success: true,
        folder: mapFolderSummary(response.data.folder),
      } satisfies FolderResponse))
      .catch((error) => toErrorResult<FolderResponse>(error, 'Failed to rename folder'));
  }

  async moveFolder(
    teamCode: string,
    id: number,
    parentId: number | null,
  ): Promise<FolderResponse> {
    return axiosInstance
      .patch(`${this.foldersUrl(teamCode)}/${id}`, {
        folder: { parent_id: parentId },
      })
      .then((response) => ({
        success: true,
        folder: mapFolderSummary(response.data.folder),
      } satisfies FolderResponse))
      .catch((error) => toErrorResult<FolderResponse>(error, 'Failed to move folder'));
  }

  async deleteFolder(
    teamCode: string,
    id: number,
    mode: 'cascade' | 'promote',
  ): Promise<DeleteFolderResponse> {
    return axiosInstance
      .delete(`${this.foldersUrl(teamCode)}/${id}`, { params: { mode } })
      .then(() => ({
        success: true,
      } satisfies DeleteFolderResponse))
      .catch((error) => toErrorResult<DeleteFolderResponse>(error, 'Failed to delete folder'));
  }
}
