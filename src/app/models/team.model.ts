export type TeamRole = 'user' | 'admin' | 'owner';

export interface Team {
  id: number;
  name: string;
  code: string;
}

export interface TeamWithRole extends Team {
  role: TeamRole;
}

export interface TeamMember {
  id: number;
  username: string;
  role: TeamRole;
}

export interface CreateTeamParams {
  name: string;
  password: string;
}

export interface JoinTeamParams {
  code: string;
  password: string;
}

export type CreateTeamResponse =
  | { success: true; team: Team; role: TeamRole }
  | { success: false; statusMessage: string };

export type JoinTeamResponse =
  | { success: true; team: Team; role: TeamRole }
  | { success: false; statusMessage: string };

export type ActivateTeamResponse =
  | { success: true; team: Team; role: TeamRole }
  | { success: false; statusMessage: string };

export type RenameTeamResponse =
  | { success: true; team: Team }
  | { success: false; statusMessage: string };

export type DeleteTeamResponse =
  | { success: true }
  | { success: false; statusMessage: string };
