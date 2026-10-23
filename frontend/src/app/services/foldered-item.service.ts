import {AxiosResponse} from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {ErrorCode} from "@config/errorCodes";
import {apiRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {projectQuery} from "@utils/projectQuery";
import {mapAvatar, RawAvatar} from "@services/avatar.service";
import {
  CreateFolderedItemParams,
  DeleteFolderedItemResponse,
  FolderedItemDetail,
  FolderedItemEditingUser,
  FolderedItemResponse,
  FolderedItemSummary,
  FolderedItemUser,
  ListFolderedItemsResponse,
  SaveFolderedItemParams
} from "@models/foldered-item.model";

interface RawFolderedItemUser {
  id: number;
  nickname: string;
  avatar: RawAvatar;
}

interface RawFolderedItemEditingUser {
  id: number;
  nickname: string;
}

interface RawFolderedItemSummary {
  id: number;
  title: string;
  folder_id: number | null;
  project_id: number | null;
  creator: RawFolderedItemUser;
  created_at: string;
  updated_at: string;
}

interface RawFolderedItemDetail extends RawFolderedItemSummary {
  content: string;
  contributors?: RawFolderedItemUser[];
  currently_editing: RawFolderedItemEditingUser | null;
}

export function mapFolderedItemUser(raw: RawFolderedItemUser): FolderedItemUser {
  return {
    id: raw.id,
    nickname: raw.nickname,
    avatar: mapAvatar(raw.avatar),
  };
}

export function mapFolderedItemEditingUser(raw: RawFolderedItemEditingUser): FolderedItemEditingUser {
  return {
    id: raw.id,
    nickname: raw.nickname,
  };
}

export function mapFolderedItemSummary(raw: RawFolderedItemSummary): FolderedItemSummary {
  return {
    id: raw.id,
    title: raw.title,
    folderId: raw.folder_id,
    projectId: raw.project_id,
    creator: mapFolderedItemUser(raw.creator),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function mapFolderedItemDetail(raw: RawFolderedItemDetail): FolderedItemDetail {
  return {
    ...mapFolderedItemSummary(raw),
    content: raw.content,
    contributors: (raw.contributors ?? []).map(mapFolderedItemUser),
    currentlyEditing: raw.currently_editing ? mapFolderedItemEditingUser(raw.currently_editing) : null,
  };
}

export abstract class FolderedItemService<E extends ErrorCode> {
  protected abstract readonly resource: string;
  protected abstract readonly key: string;

  async list(teamCode: string, projectId: number | null = null): Promise<ListFolderedItemsResponse> {
    return apiRequest<ListFolderedItemsResponse>(
      axiosInstance.get(this.itemsUrl(teamCode), projectQuery(projectId)),
      (data) => ({success: true, items: (data[this.resource] as RawFolderedItemSummary[]).map(mapFolderedItemSummary)}),
    );
  }

  async create(teamCode: string, params: CreateFolderedItemParams): Promise<FolderedItemResponse<E>> {
    return this.requestItem(axiosInstance.post(this.itemsUrl(teamCode), {
      [this.key]: {title: params.title, content: params.content, project_id: params.projectId, folder_id: params.folderId}
    }));
  }

  async setProject(teamCode: string, id: number, projectId: number | null): Promise<FolderedItemResponse<E>> {
    return this.requestItem(axiosInstance.patch(this.itemsUrl(teamCode, id), {[this.key]: {project_id: projectId}}));
  }

  async get(teamCode: string, id: number): Promise<FolderedItemResponse<E>> {
    return this.requestItem(axiosInstance.get(this.itemsUrl(teamCode, id)));
  }

  async save(teamCode: string, id: number, params: SaveFolderedItemParams): Promise<FolderedItemResponse<E>> {
    return this.requestItem(axiosInstance.patch(this.itemsUrl(teamCode, id), {[this.key]: params}));
  }

  async rename(teamCode: string, id: number, title: string): Promise<FolderedItemResponse<E>> {
    return this.requestItem(axiosInstance.patch(this.itemsUrl(teamCode, id), {[this.key]: {title}}));
  }

  async moveToFolder(teamCode: string, id: number, folderId: number | null): Promise<FolderedItemResponse<E>> {
    return this.requestItem(axiosInstance.patch(this.itemsUrl(teamCode, id), {[this.key]: {folder_id: folderId}}));
  }

  async delete(teamCode: string, id: number): Promise<DeleteFolderedItemResponse<E>> {
    return apiRequest<DeleteFolderedItemResponse<E>>(
      axiosInstance.delete(this.itemsUrl(teamCode, id)),
      () => ({success: true}),
    );
  }

  private requestItem(request: Promise<AxiosResponse>): Promise<FolderedItemResponse<E>> {
    return apiRequest<FolderedItemResponse<E>>(
      request,
      (data) => ({success: true, item: mapFolderedItemDetail(data[this.key])}),
    );
  }

  private itemsUrl(teamCode: string, id?: number): string {
    return id === undefined ? teamPath(teamCode, this.resource) : teamPath(teamCode, this.resource, id);
  }
}
