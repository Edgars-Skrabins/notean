export type TeamRole = 'user' | 'admin' | 'owner';

export enum NicknameError {
  TOO_SHORT = 'TOO_SHORT',
  TOO_LONG = 'TOO_LONG',
  INVALID_CHARACTERS = 'INVALID_CHARACTERS',
  TAKEN = 'TAKEN',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
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

export type CreateTeamResponse =
  | { success: true; team: Team; role: TeamRole; nickname: string }
  | { success: false; statusMessage: string; nicknameError: NicknameError | null };

export type JoinTeamResponse =
  | { success: true; team: Team; role: TeamRole; nickname: string }
  | { success: false; statusMessage: string; nicknameError: NicknameError | null };

export type ActivateTeamResponse =
  | { success: true; team: Team; role: TeamRole; nickname: string }
  | { success: false; statusMessage: string };

export type RenameTeamResponse =
  | { success: true; team: Team }
  | { success: false; statusMessage: string };

export type DeleteTeamResponse =
  | { success: true }
  | { success: false; statusMessage: string };

export type UpdateNicknameResponse =
  | { success: true; nickname: string }
  | { success: false; error: NicknameError };
