import {Result} from "@models/result.model";
import {TeamsErrorCode} from "@config/errorCodes";
import {Avatar} from "@models/avatar.model";

export type TeamRole = 'user' | 'admin' | 'owner';

export enum NicknameError {
  TOO_SHORT = 'TOO_SHORT',
  TOO_LONG = 'TOO_LONG',
  INVALID_CHARACTERS = 'INVALID_CHARACTERS',
}

export interface Team {
  id: number;
  name: string;
  code: string;
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

export type UpdateNicknameResponse = Result<{ nickname: string }, TeamsErrorCode>;
