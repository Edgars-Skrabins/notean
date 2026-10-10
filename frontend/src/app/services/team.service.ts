import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
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
  TeamWithRole,
  UpdateNicknameResponse
} from "@models/team.model";
import {mapAvatar, RawAvatar} from "@services/avatar.service";
import {ActiveTeam} from "@models/session.model";
import {teamPath} from "@utils/teamPath";

interface RawTeamMember {
  id: number;
  nickname: string;
  role: TeamRole;
  avatar: RawAvatar;
}

export function mapTeamMember(raw: RawTeamMember): TeamMember {
  return {
    id: raw.id,
    nickname: raw.nickname,
    role: raw.role,
    avatar: mapAvatar(raw.avatar),
  };
}

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

  getCurrentTeam(): Team | null {
    return this.currentTeam;
  }

  getCurrentTeamCode(): string {
    return this.currentTeam!.code;
  }

  getCurrentRole(): TeamRole | null {
    return this.currentRole;
  }

  getCurrentNickname(): string | null {
    return this.currentNickname;
  }

  applyActiveTeam(active: ActiveTeam | null) {
    if (active) {
      this.setCurrentTeam(active.team, active.role, active.nickname);
    } else {
      this.clearCurrentTeam();
    }
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
    return apiRequest<CreateTeamResponse>(
      axiosInstance.post(this.createTeamUrl, {team: params}),
      (data) => this.applyTeamResponse(data),
    );
  }

  async joinTeam(params: JoinTeamParams): Promise<JoinTeamResponse> {
    return apiRequest<JoinTeamResponse>(
      axiosInstance.post(this.joinTeamUrl, {team: params}),
      (data) => this.applyTeamResponse(data),
    );
  }

  async activateTeam(code: string): Promise<ActivateTeamResponse> {
    return apiRequest<ActivateTeamResponse>(
      axiosInstance.post(`${this.teamUrl(code)}/activate`),
      (data) => this.applyTeamResponse(data),
    );
  }

  async fetchTeamMembers(code: string): Promise<TeamMember[]> {
    return axiosInstance.get(`${this.teamUrl(code)}/members`)
      .then((response) => (response.data.members as RawTeamMember[]).map(mapTeamMember))
      .catch(() => []);
  }

  async renameTeam(code: string, name: string): Promise<RenameTeamResponse> {
    return apiRequest<RenameTeamResponse>(
      axiosInstance.patch(this.teamUrl(code), {team: {name}}),
      (data) => {
        const team = data.team as Team;
        if (this.currentTeam?.code === code && this.currentRole && this.currentNickname) {
          this.setCurrentTeam(team, this.currentRole, this.currentNickname);
        }
        return {success: true, team};
      },
    );
  }

  async deleteTeam(code: string): Promise<DeleteTeamResponse> {
    return apiRequest<DeleteTeamResponse>(
      axiosInstance.delete(this.teamUrl(code)),
      () => {
        if (this.currentTeam?.code === code) {
          this.clearCurrentTeam();
        }
        return {success: true};
      },
    );
  }

  async updateNickname(nickname: string): Promise<UpdateNicknameResponse> {
    const team = this.currentTeam;
    if (!team) {
      return {success: false, code: 'TEAM_NOT_FOUND'};
    }

    return apiRequest<UpdateNicknameResponse>(
      axiosInstance.patch(`${this.teamUrl(team.code)}/nickname`, {membership: {nickname}}),
      (data) => {
        const updatedNickname = data.nickname as string;
        if (this.currentTeam?.code === team.code) {
          this.currentNickname = updatedNickname;
          localStorage.setItem(this.nicknameStorageKey, updatedNickname);
        }
        return {success: true, nickname: updatedNickname};
      },
    );
  }


  private applyTeamResponse(data: { team: Team; role: TeamRole; nickname: string }) {
    this.setCurrentTeam(data.team, data.role, data.nickname);
    return {success: true as const, team: data.team, role: data.role, nickname: data.nickname};
  }

  private teamUrl(code: string) {
    return teamPath(code);
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
