import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
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
  username: string;
}

interface RawDiagramSummary {
  id: number;
  title: string;
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
    username: raw.username,
  };
}

export function mapDiagramSummary(raw: RawDiagramSummary): DiagramSummary {
  return {
    id: raw.id,
    title: raw.title,
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
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to load diagrams';
        return {success: false, statusMessage} satisfies ListDiagramsResponse;
      });
  }

  async createDiagram(teamCode: string, title?: string): Promise<DiagramResponse> {
    return axiosInstance.post(this.diagramsUrl(teamCode), {diagram: {title}})
      .then((response) => {
        return {success: true, diagram: mapDiagramDetail(response.data.diagram)} satisfies DiagramResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to create diagram';
        return {success: false, statusMessage} satisfies DiagramResponse;
      });
  }

  async getDiagram(teamCode: string, id: number): Promise<DiagramResponse> {
    return axiosInstance.get(`${this.diagramsUrl(teamCode)}/${id}`)
      .then((response) => {
        return {success: true, diagram: mapDiagramDetail(response.data.diagram)} satisfies DiagramResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to load diagram';
        return {success: false, statusMessage} satisfies DiagramResponse;
      });
  }

  async saveDiagram(teamCode: string, id: number, params: SaveDiagramParams): Promise<DiagramResponse> {
    return axiosInstance.patch(`${this.diagramsUrl(teamCode)}/${id}`, {diagram: params})
      .then((response) => {
        return {success: true, diagram: mapDiagramDetail(response.data.diagram)} satisfies DiagramResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to save diagram';
        return {success: false, statusMessage} satisfies DiagramResponse;
      });
  }

  async deleteDiagram(teamCode: string, id: number): Promise<DeleteDiagramResponse> {
    return axiosInstance.delete(`${this.diagramsUrl(teamCode)}/${id}`)
      .then(() => {
        return {success: true} satisfies DeleteDiagramResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to delete diagram';
        return {success: false, statusMessage} satisfies DeleteDiagramResponse;
      });
  }
}
