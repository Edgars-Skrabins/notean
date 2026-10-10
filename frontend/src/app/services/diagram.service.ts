import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {toErrorResult} from "@utils/httpError";
import {
  DeleteDiagramResponse,
  DiagramDetail,
  DiagramResponse,
  DiagramSummary,
  DiagramUser,
  ListDiagramsResponse,
  SaveDiagramParams
} from "@models/diagram.model";

interface RawDiagramUser {
  id: number;
  nickname: string;
}

interface RawDiagramSummary {
  id: number;
  title: string;
  folder_id: number | null;
  creator: RawDiagramUser;
  created_at: string;
  updated_at: string;
}

interface RawDiagramDetail extends RawDiagramSummary {
  content: string;
  contributors?: RawDiagramUser[];
  currently_editing: RawDiagramUser | null;
}

export function mapDiagramUser(raw: RawDiagramUser): DiagramUser {
  return {
    id: raw.id,
    nickname: raw.nickname,
  };
}

export function mapDiagramSummary(raw: RawDiagramSummary): DiagramSummary {
  return {
    id: raw.id,
    title: raw.title,
    folderId: raw.folder_id,
    creator: mapDiagramUser(raw.creator),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function mapDiagramDetail(raw: RawDiagramDetail): DiagramDetail {
  return {
    ...mapDiagramSummary(raw),
    content: raw.content,
    contributors: (raw.contributors ?? []).map(mapDiagramUser),
    currentlyEditing: raw.currently_editing ? mapDiagramUser(raw.currently_editing) : null,
  };
}

@Injectable({
  providedIn: 'root',
})
export class DiagramService {
  private diagramsUrl(teamCode: string) {
    return `/teams/${teamCode}/diagrams`;
  }

  async listDiagrams(teamCode: string, search?: string): Promise<ListDiagramsResponse> {
    return axiosInstance.get(this.diagramsUrl(teamCode), {params: search ? {search} : undefined})
      .then((response) => {
        const diagrams = (response.data.diagrams ?? response.data) as RawDiagramSummary[];
        return {success: true, diagrams: diagrams.map(mapDiagramSummary)} satisfies ListDiagramsResponse;
      })
      .catch((error) => toErrorResult<ListDiagramsResponse>(error, 'Failed to load diagrams'));
  }

  async createDiagram(teamCode: string, title?: string): Promise<DiagramResponse> {
    return axiosInstance.post(this.diagramsUrl(teamCode), {diagram: {title}})
      .then((response) => {
        return {success: true, diagram: mapDiagramDetail(response.data.diagram)} satisfies DiagramResponse;
      })
      .catch((error) => toErrorResult<DiagramResponse>(error, 'Failed to create diagram'));
  }

  async getDiagram(teamCode: string, id: number): Promise<DiagramResponse> {
    return axiosInstance.get(`${this.diagramsUrl(teamCode)}/${id}`)
      .then((response) => {
        return {success: true, diagram: mapDiagramDetail(response.data.diagram)} satisfies DiagramResponse;
      })
      .catch((error) => toErrorResult<DiagramResponse>(error, 'Failed to load diagram'));
  }

  async saveDiagram(teamCode: string, id: number, params: SaveDiagramParams): Promise<DiagramResponse> {
    return axiosInstance.patch(`${this.diagramsUrl(teamCode)}/${id}`, {diagram: params})
      .then((response) => {
        return {success: true, diagram: mapDiagramDetail(response.data.diagram)} satisfies DiagramResponse;
      })
      .catch((error) => toErrorResult<DiagramResponse>(error, 'Failed to save diagram'));
  }

  async moveToFolder(teamCode: string, id: number, folderId: number | null): Promise<DiagramResponse> {
    return axiosInstance.patch(`${this.diagramsUrl(teamCode)}/${id}`, {diagram: {folder_id: folderId}})
      .then((response) => {
        return {success: true, diagram: mapDiagramDetail(response.data.diagram)} satisfies DiagramResponse;
      })
      .catch((error) => toErrorResult<DiagramResponse>(error, 'Failed to move diagram'));
  }

  async deleteDiagram(teamCode: string, id: number): Promise<DeleteDiagramResponse> {
    return axiosInstance.delete(`${this.diagramsUrl(teamCode)}/${id}`)
      .then(() => {
        return {success: true} satisfies DeleteDiagramResponse;
      })
      .catch((error) => toErrorResult<DeleteDiagramResponse>(error, 'Failed to delete diagram'));
  }
}
