import {Result} from "@models/result.model";
import {ProjectsErrorCode, TeamAccessErrorCode} from "@config/errorCodes";
import {BoardUser} from "@models/board.model";

export interface ProjectSummary {
  id: number;
  name: string;
  description: string;
  owner: BoardUser;
  memberCount: number;
  canManage: boolean;
}

export interface ProjectOption {
  id: number;
  name: string;
}

export interface ProjectDetail extends ProjectSummary {
  members: BoardUser[];
  createdAt: string;
}

export interface ProjectParams {
  name: string;
  description: string;
  ownerUserId: number;
  memberIds: number[];
}

export type DeleteProjectMode = 'keep' | 'delete_items';

export interface ListProjectsParams {
  search?: string;
  offset?: number;
}

export type ListProjectsResponse = Result<{ projects: ProjectSummary[], hasMore: boolean }, TeamAccessErrorCode>;

export type ListProjectOptionsResponse = Result<{ projects: ProjectOption[] }, TeamAccessErrorCode>;

export type ProjectResponse = Result<{ project: ProjectDetail }, TeamAccessErrorCode | ProjectsErrorCode>;

export type DeleteProjectResponse = Result<object, TeamAccessErrorCode | ProjectsErrorCode>;
