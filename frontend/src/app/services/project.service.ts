import {Injectable} from '@angular/core';
import {AxiosResponse} from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {mapBoardUser, RawBoardUser} from "@services/board.service";
import {
  DeleteProjectMode,
  DeleteProjectResponse,
  ListProjectsResponse,
  ProjectDetail,
  ProjectParams,
  ProjectResponse,
  ProjectSummary
} from "@models/project.model";

interface RawProjectSummary {
  id: number;
  name: string;
  description: string;
  owner: RawBoardUser;
  member_count: number;
  can_manage: boolean;
}

interface RawProjectDetail extends RawProjectSummary {
  members: RawBoardUser[];
  created_at: string;
}

export function mapProjectSummary(raw: RawProjectSummary): ProjectSummary {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    owner: mapBoardUser(raw.owner),
    memberCount: raw.member_count,
    canManage: raw.can_manage,
  };
}

export function mapProjectDetail(raw: RawProjectDetail): ProjectDetail {
  return {
    ...mapProjectSummary(raw),
    members: raw.members.map(mapBoardUser),
    createdAt: raw.created_at,
  };
}

function toRawParams(params: ProjectParams) {
  return {
    name: params.name,
    description: params.description,
    owner_user_id: params.ownerUserId,
    member_ids: params.memberIds,
  };
}

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  async listProjects(teamCode: string): Promise<ListProjectsResponse> {
    return apiRequest<ListProjectsResponse>(
      axiosInstance.get(this.projectsUrl(teamCode)),
      (data) => ({success: true, projects: (data.projects as RawProjectSummary[]).map(mapProjectSummary)}),
    );
  }

  async getProject(teamCode: string, id: number): Promise<ProjectResponse> {
    return this.requestProject(axiosInstance.get(this.projectsUrl(teamCode, id)));
  }

  async createProject(teamCode: string, params: ProjectParams): Promise<ProjectResponse> {
    return this.requestProject(axiosInstance.post(this.projectsUrl(teamCode), {project: toRawParams(params)}));
  }

  async updateProject(teamCode: string, id: number, params: ProjectParams): Promise<ProjectResponse> {
    return this.requestProject(axiosInstance.patch(this.projectsUrl(teamCode, id), {project: toRawParams(params)}));
  }

  async deleteProject(teamCode: string, id: number, mode: DeleteProjectMode, confirmName: string): Promise<DeleteProjectResponse> {
    return apiRequest<DeleteProjectResponse>(
      axiosInstance.delete(this.projectsUrl(teamCode, id), {data: {project: {mode, confirm_name: confirmName}}}),
      () => ({success: true}),
    );
  }

  private requestProject(request: Promise<AxiosResponse>): Promise<ProjectResponse> {
    return apiRequest<ProjectResponse>(
      request,
      (data) => ({success: true, project: mapProjectDetail(data.project)}),
    );
  }

  private projectsUrl(teamCode: string, id?: number) {
    return id === undefined ? teamPath(teamCode, 'projects') : teamPath(teamCode, 'projects', id);
  }
}
