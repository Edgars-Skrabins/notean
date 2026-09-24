import { Injectable } from '@angular/core';
import { axiosInstance } from '@config/axiosConfig';
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
  username: string;
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
    username: raw.username,
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
      .catch((error) => ({
        success: false,
        statusMessage:
          error.response?.data?.statusMessage ?? 'Failed to load folders',
      } satisfies ListFoldersResponse));
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
      .catch((error) => ({
        success: false,
        statusMessage:
          error.response?.data?.statusMessage ?? 'Failed to create folder',
      } satisfies FolderResponse));
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
      .catch((error) => ({
        success: false,
        statusMessage:
          error.response?.data?.statusMessage ?? 'Failed to move folder',
      } satisfies FolderResponse));
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
      .catch((error) => ({
        success: false,
        statusMessage:
          error.response?.data?.statusMessage ?? 'Failed to delete folder',
      } satisfies DeleteFolderResponse));
  }
}
