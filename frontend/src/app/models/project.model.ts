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

export type ListProjectsResponse = Result<{ projects: ProjectSummary[] }, TeamAccessErrorCode>;

export type ProjectResponse = Result<{ project: ProjectDetail }, TeamAccessErrorCode | ProjectsErrorCode>;

export type DeleteProjectResponse = Result<object, TeamAccessErrorCode | ProjectsErrorCode>;
