import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {toErrorResult} from "@utils/httpError";
import {
  DeletePageResponse,
  ListPagesResponse,
  PageDetail,
  PageResponse,
  PageSummary,
  PageUser,
  SavePageParams
} from "@models/page.model";

interface RawPageUser {
  id: number;
  nickname: string;
}

interface RawPageSummary {
  id: number;
  title: string;
  folder_id: number | null;
  creator: RawPageUser;
  created_at: string;
  updated_at: string;
}

interface RawPageDetail extends RawPageSummary {
  content: string;
  contributors?: RawPageUser[];
  currently_editing: RawPageUser | null;
}

export function mapPageUser(raw: RawPageUser): PageUser {
  return {
    id: raw.id,
    nickname: raw.nickname,
  };
}

export function mapPageSummary(raw: RawPageSummary): PageSummary {
  return {
    id: raw.id,
    title: raw.title,
    folderId: raw.folder_id,
    creator: mapPageUser(raw.creator),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function mapPageDetail(raw: RawPageDetail): PageDetail {
  return {
    ...mapPageSummary(raw),
    content: raw.content,
    contributors: (raw.contributors ?? []).map(mapPageUser),
    currentlyEditing: raw.currently_editing ? mapPageUser(raw.currently_editing) : null,
  };
}

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private pagesUrl(teamCode: string) {
    return `/teams/${teamCode}/pages`;
  }

  async listPages(teamCode: string, search?: string): Promise<ListPagesResponse> {
    return axiosInstance.get(this.pagesUrl(teamCode), {params: search ? {search} : undefined})
      .then((response) => {
        const pages = (response.data.pages ?? response.data) as RawPageSummary[];
        return {success: true, pages: pages.map(mapPageSummary)} satisfies ListPagesResponse;
      })
      .catch((error) => toErrorResult<ListPagesResponse>(error, 'Failed to load pages'));
  }

  async createPage(teamCode: string, title?: string): Promise<PageResponse> {
    return axiosInstance.post(this.pagesUrl(teamCode), {page: {title}})
      .then((response) => {
        return {success: true, page: mapPageDetail(response.data.page)} satisfies PageResponse;
      })
      .catch((error) => toErrorResult<PageResponse>(error, 'Failed to create page'));
  }

  async getPage(teamCode: string, id: number): Promise<PageResponse> {
    return axiosInstance.get(`${this.pagesUrl(teamCode)}/${id}`)
      .then((response) => {
        return {success: true, page: mapPageDetail(response.data.page)} satisfies PageResponse;
      })
      .catch((error) => toErrorResult<PageResponse>(error, 'Failed to load page'));
  }

  async savePage(teamCode: string, id: number, params: SavePageParams): Promise<PageResponse> {
    return axiosInstance.patch(`${this.pagesUrl(teamCode)}/${id}`, {page: params})
      .then((response) => {
        return {success: true, page: mapPageDetail(response.data.page)} satisfies PageResponse;
      })
      .catch((error) => toErrorResult<PageResponse>(error, 'Failed to save page'));
  }

  async moveToFolder(teamCode: string, id: number, folderId: number | null): Promise<PageResponse> {
    return axiosInstance.patch(`${this.pagesUrl(teamCode)}/${id}`, {page: {folder_id: folderId}})
      .then((response) => {
        return {success: true, page: mapPageDetail(response.data.page)} satisfies PageResponse;
      })
      .catch((error) => toErrorResult<PageResponse>(error, 'Failed to move page'));
  }

  async deletePage(teamCode: string, id: number): Promise<DeletePageResponse> {
    return axiosInstance.delete(`${this.pagesUrl(teamCode)}/${id}`)
      .then(() => {
        return {success: true} satisfies DeletePageResponse;
      })
      .catch((error) => toErrorResult<DeletePageResponse>(error, 'Failed to delete page'));
  }
}
