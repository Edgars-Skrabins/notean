import {Injectable} from '@angular/core';
import axios from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {toErrorResult} from "@utils/httpError";
import {
  ActivateTeamResponse,
  CreateTeamParams,
  CreateTeamResponse,
  DeleteTeamResponse,
  JoinTeamParams,
  JoinTeamResponse,
  NicknameError,
  RenameTeamResponse,
  Team,
  TeamMember,
  TeamRole,
  TeamWithRole,
  UpdateNicknameResponse
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
  private nicknameStorageKey = 'currentNickname';

  private currentTeam: Team | null = this.readStoredTeam();
  private currentRole: TeamRole | null = this.readStoredRole();
  private currentNickname: string | null = this.readStoredNickname();

  constructor() {
    if (this.currentTeam && (!this.currentRole || !this.currentNickname)) {
      this.fetchMyTeam();
    }
  }

  getCurrentTeam(): Team | null {
    return this.currentTeam;
  }

  getCurrentRole(): TeamRole | null {
    return this.currentRole;
  }

  getCurrentNickname(): string | null {
    return this.currentNickname;
  }

  clearCurrentTeam() {
    this.currentTeam = null;
    this.currentRole = null;
    this.currentNickname = null;
    localStorage.removeItem(this.teamStorageKey);
    localStorage.removeItem(this.teamRoleStorageKey);
    localStorage.removeItem(this.nicknameStorageKey);
  }

  async fetchMyTeam(): Promise<Team | null> {
    return axiosInstance.get(this.myTeamUrl)
      .then((response) => {
        const team = response.data.team as Team | null;
        const role = response.data.role as TeamRole | null;
        const nickname = response.data.nickname as string | null;
        if (team && role && nickname) {
          this.setCurrentTeam(team, role, nickname);
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
        const nickname = response.data.nickname as string;
        this.setCurrentTeam(team, role, nickname);
        return {success: true, team, role, nickname} satisfies CreateTeamResponse;
      })
      .catch((error) => ({
        ...toErrorResult<CreateTeamResponse>(error, 'Failed to create team'),
        nicknameError: this.toRequestNicknameError(error),
      }));
  }

  async joinTeam(params: JoinTeamParams): Promise<JoinTeamResponse> {
    return axiosInstance.post(this.joinTeamUrl, {team: params})
      .then((response) => {
        const team = response.data.team as Team;
        const role = response.data.role as TeamRole;
        const nickname = response.data.nickname as string;
        this.setCurrentTeam(team, role, nickname);
        return {success: true, team, role, nickname} satisfies JoinTeamResponse;
      })
      .catch((error) => ({
        ...toErrorResult<JoinTeamResponse>(error, 'Failed to join team'),
        nicknameError: this.toRequestNicknameError(error),
      }));
  }

  async activateTeam(code: string): Promise<ActivateTeamResponse> {
    return axiosInstance.post(`${this.teamUrl(code)}/activate`)
      .then((response) => {
        const team = response.data.team as Team;
        const role = response.data.role as TeamRole;
        const nickname = response.data.nickname as string;
        this.setCurrentTeam(team, role, nickname);
        return {success: true, team, role, nickname} satisfies ActivateTeamResponse;
      })
      .catch((error) => toErrorResult<ActivateTeamResponse>(error, 'Failed to switch team'));
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
        if (this.currentTeam?.code === code && this.currentRole && this.currentNickname) {
          this.setCurrentTeam(team, this.currentRole, this.currentNickname);
        }
        return {success: true, team} satisfies RenameTeamResponse;
      })
      .catch((error) => toErrorResult<RenameTeamResponse>(error, 'Failed to rename team'));
  }

  async deleteTeam(code: string): Promise<DeleteTeamResponse> {
    return axiosInstance.delete(this.teamUrl(code))
      .then(() => {
        if (this.currentTeam?.code === code) {
          this.clearCurrentTeam();
        }
        return {success: true} satisfies DeleteTeamResponse;
      })
      .catch((error) => toErrorResult<DeleteTeamResponse>(error, 'Failed to delete team'));
  }

  async updateNickname(nickname: string): Promise<UpdateNicknameResponse> {
    const team = this.currentTeam;
    if (!team) {
      return {success: false, error: NicknameError.UNKNOWN};
    }

    return axiosInstance.patch(`${this.teamUrl(team.code)}/nickname`, {membership: {nickname}})
      .then((response) => {
        const updatedNickname = response.data.nickname as string;
        if (this.currentTeam?.code === team.code) {
          this.currentNickname = updatedNickname;
          localStorage.setItem(this.nicknameStorageKey, updatedNickname);
        }
        return {success: true, nickname: updatedNickname} satisfies UpdateNicknameResponse;
      })
      .catch((error) => ({success: false, error: this.toNicknameError(error)} satisfies UpdateNicknameResponse));
  }

  private toNicknameError(error: unknown): NicknameError {
    if (!axios.isAxiosError(error)) {
      return NicknameError.UNKNOWN;
    }
    if (!error.response) {
      return NicknameError.NETWORK;
    }
    if (error.response.status === 409) {
      return NicknameError.TAKEN;
    }
    return NicknameError.UNKNOWN;
  }

  private toRequestNicknameError(error: unknown): NicknameError | null {
    const nicknameError = this.toNicknameError(error);
    return nicknameError === NicknameError.UNKNOWN ? null : nicknameError;
  }

  private teamUrl(code: string) {
    return `/teams/${code}`;
  }

  private setCurrentTeam(team: Team, role: TeamRole, nickname: string) {
    this.currentTeam = team;
    this.currentRole = role;
    this.currentNickname = nickname;
    localStorage.setItem(this.teamStorageKey, JSON.stringify(team));
    localStorage.setItem(this.teamRoleStorageKey, role);
    localStorage.setItem(this.nicknameStorageKey, nickname);
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

  private readStoredNickname(): string | null {
    return localStorage.getItem(this.nicknameStorageKey);
  }
}
