import {Result} from "@models/result.model";
import {TeamsErrorCode} from "@config/errorCodes";
import {Avatar} from "@models/avatar.model";

export type TeamRole = 'user' | 'admin' | 'owner';

export type TeamFeature = 'pages' | 'diagrams' | 'boards';

export type TeamFeatures = Record<TeamFeature, boolean>;

export enum NicknameError {
  TOO_SHORT = 'TOO_SHORT',
  TOO_LONG = 'TOO_LONG',
  INVALID_CHARACTERS = 'INVALID_CHARACTERS',
}

export interface Team {
  id: number;
  name: string;
  code: string;
  pagesEnabled: boolean;
  diagramsEnabled: boolean;
  boardsEnabled: boolean;
}

export interface TeamWithRole extends Team {
  role: TeamRole;
  nickname: string;
}

export interface TeamMember {
  id: number;
  nickname: string;
  role: TeamRole;
  avatar: Avatar;
}

export interface CreateTeamParams {
  name: string;
  password: string;
  nickname: string;
}

export interface JoinTeamParams {
  code: string;
  password: string;
  nickname: string;
}

export type CreateTeamResponse = Result<{ team: Team; role: TeamRole; nickname: string }, TeamsErrorCode>;

export type JoinTeamResponse = Result<{ team: Team; role: TeamRole; nickname: string }, TeamsErrorCode>;

export type ActivateTeamResponse = Result<{ team: Team; role: TeamRole; nickname: string }, TeamsErrorCode>;

export type RenameTeamResponse = Result<{ team: Team }, TeamsErrorCode>;

export type DeleteTeamResponse = Result<object, TeamsErrorCode>;

export type UpdateFeaturesResponse = Result<{ team: Team }, TeamsErrorCode>;

export type UpdateNicknameResponse = Result<{ nickname: string }, TeamsErrorCode>;

export type RemoveMemberResponse = Result<{ members: TeamMember[] }, TeamsErrorCode>;

export type UpdateMemberRoleResponse = Result<{ members: TeamMember[] }, TeamsErrorCode>;

export type TransferOwnershipResponse = Result<{ members: TeamMember[]; role: TeamRole }, TeamsErrorCode>;

export type LeaveTeamResponse = Result<object, TeamsErrorCode>;
