import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {
  ActivateTeamResponse,
  CreateTeamParams,
  CreateTeamResponse,
  DeleteTeamResponse,
  JoinTeamParams,
  JoinTeamResponse,
  RenameTeamResponse,
  Team,
  TeamMember,
  TeamRole,
  TeamWithRole
} from "@models/team.model";

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private createTeamUrl = '/teams';
  private joinTeamUrl = '/actions/jointeam';
  private myTeamUrl = '/teams/mine';
  private myTeamsUrl = '/teams/mine/all';
  private teamStorageKey = 'currentTeam';
  private teamRoleStorageKey = 'currentTeamRole';

  private currentTeam: Team | null = this.readStoredTeam();
  private currentRole: TeamRole | null = this.readStoredRole();

  constructor() {
    if (this.currentTeam && !this.currentRole) {
      this.fetchMyTeam();
    }
  }

  getCurrentTeam(): Team | null {
    return this.currentTeam;
  }

  getCurrentRole(): TeamRole | null {
    return this.currentRole;
  }

  clearCurrentTeam() {
    this.currentTeam = null;
    this.currentRole = null;
    localStorage.removeItem(this.teamStorageKey);
    localStorage.removeItem(this.teamRoleStorageKey);
  }

  async fetchMyTeam(): Promise<Team | null> {
    return axiosInstance.get(this.myTeamUrl)
      .then((response) => {
        const team = response.data.team as Team | null;
        const role = response.data.role as TeamRole | null;
        if (team && role) {
          this.setCurrentTeam(team, role);
        }
        return team;
      })
      .catch(() => null);
  }

  async fetchMyTeams(): Promise<TeamWithRole[]> {
    return axiosInstance.get(this.myTeamsUrl)
      .then((response) => response.data.teams as TeamWithRole[])
      .catch(() => []);
  }

  async createTeam(params: CreateTeamParams): Promise<CreateTeamResponse> {
    return axiosInstance.post(this.createTeamUrl, {team: params})
      .then((response) => {
        const team = response.data.team as Team;
        const role = response.data.role as TeamRole;
        this.setCurrentTeam(team, role);
        return {success: true, team, role} satisfies CreateTeamResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to create team';
        return {success: false, statusMessage} satisfies CreateTeamResponse;
      });
  }

  async joinTeam(params: JoinTeamParams): Promise<JoinTeamResponse> {
    return axiosInstance.post(this.joinTeamUrl, {team: params})
      .then((response) => {
        const team = response.data.team as Team;
        const role = response.data.role as TeamRole;
        this.setCurrentTeam(team, role);
        return {success: true, team, role} satisfies JoinTeamResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to join team';
        return {success: false, statusMessage} satisfies JoinTeamResponse;
      });
  }

  async activateTeam(code: string): Promise<ActivateTeamResponse> {
    return axiosInstance.post(`${this.teamUrl(code)}/activate`)
      .then((response) => {
        const team = response.data.team as Team;
        const role = response.data.role as TeamRole;
        this.setCurrentTeam(team, role);
        return {success: true, team, role} satisfies ActivateTeamResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to switch team';
        return {success: false, statusMessage} satisfies ActivateTeamResponse;
      });
  }

  async fetchTeamMembers(code: string): Promise<TeamMember[]> {
    return axiosInstance.get(`${this.teamUrl(code)}/members`)
      .then((response) => response.data.members as TeamMember[])
      .catch(() => []);
  }

  async renameTeam(code: string, name: string): Promise<RenameTeamResponse> {
    return axiosInstance.patch(this.teamUrl(code), {team: {name}})
      .then((response) => {
        const team = response.data.team as Team;
        if (this.currentTeam?.code === code && this.currentRole) {
          this.setCurrentTeam(team, this.currentRole);
        }
        return {success: true, team} satisfies RenameTeamResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to rename team';
        return {success: false, statusMessage} satisfies RenameTeamResponse;
      });
  }

  async deleteTeam(code: string): Promise<DeleteTeamResponse> {
    return axiosInstance.delete(this.teamUrl(code))
      .then(() => {
        if (this.currentTeam?.code === code) {
          this.clearCurrentTeam();
        }
        return {success: true} satisfies DeleteTeamResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to delete team';
        return {success: false, statusMessage} satisfies DeleteTeamResponse;
      });
  }

  private teamUrl(code: string) {
    return `/teams/${code}`;
  }

  private setCurrentTeam(team: Team, role: TeamRole) {
    this.currentTeam = team;
    this.currentRole = role;
    localStorage.setItem(this.teamStorageKey, JSON.stringify(team));
    localStorage.setItem(this.teamRoleStorageKey, role);
  }

  private readStoredTeam(): Team | null {
    const raw = localStorage.getItem(this.teamStorageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as Team;
    } catch {
      return null;
    }
  }

  private readStoredRole(): TeamRole | null {
    return localStorage.getItem(this.teamRoleStorageKey) as TeamRole | null;
  }
}
