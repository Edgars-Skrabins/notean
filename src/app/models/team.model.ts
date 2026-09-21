export interface Team {
  id: string;
  name: string;
  code: string;
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
  | { success: true; team: Team }
  | { success: false; statusMessage: string };

export type JoinTeamResponse =
  | { success: true }
  | { success: false; statusMessage: string };
