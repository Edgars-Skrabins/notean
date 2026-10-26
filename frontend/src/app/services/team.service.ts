import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {
  ActivateTeamResponse,
  CreateTeamParams,
  CreateTeamResponse,
  DeleteTeamResponse,
  JoinTeamParams,
  JoinTeamResponse,
  LeaveTeamResponse,
  RemoveMemberResponse,
  RenameTeamResponse,
  Team,
  TeamFeature,
  TeamFeatures,
  TeamMember,
  TeamRole,
  TeamWithRole,
  TransferOwnershipResponse,
  UpdateFeaturesResponse,
  UpdateMemberRoleResponse,
  UpdateNicknameResponse
} from "@models/team.model";
import {mapAvatar, RawAvatar} from "@services/avatar.service";
import {ActiveTeam} from "@models/session.model";
import {teamPath} from "@utils/teamPath";

export interface RawTeam {
  id: number;
  name: string;
  code: string;
  pages_enabled: boolean;
  diagrams_enabled: boolean;
  boards_enabled: boolean;
}

export interface RawActiveTeam {
  team: RawTeam;
  role: TeamRole;
  nickname: string;
}

interface RawTeamWithRole extends RawTeam {
  role: TeamRole;
  nickname: string;
}

interface RawTeamMember {
  id: number;
  nickname: string;
  role: TeamRole;
  avatar: RawAvatar;
}

export const ALL_FEATURES_ENABLED: TeamFeatures = {pages: true, diagrams: true, boards: true};

export function mapTeam(raw: RawTeam): Team {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    pagesEnabled: raw.pages_enabled,
    diagramsEnabled: raw.diagrams_enabled,
    boardsEnabled: raw.boards_enabled,
  };
}

export function mapActiveTeam(raw: RawActiveTeam): ActiveTeam {
  return {team: mapTeam(raw.team), role: raw.role, nickname: raw.nickname};
}

function mapTeamWithRole(raw: RawTeamWithRole): TeamWithRole {
  return {...mapTeam(raw), role: raw.role, nickname: raw.nickname};
}

function featuresOf(team: Team | null): TeamFeatures {
  if (!team) {
    return ALL_FEATURES_ENABLED;
  }

  return {
    pages: team.pagesEnabled !== false,
    diagrams: team.diagramsEnabled !== false,
    boards: team.boardsEnabled !== false,
  };
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
  private featuresSubject = new BehaviorSubject<TeamFeatures>(featuresOf(this.currentTeam));

  readonly features$: Observable<TeamFeatures> = this.featuresSubject.asObservable();

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

  isFeatureEnabled(feature: TeamFeature): boolean {
    return this.featuresSubject.value[feature];
  }

  applyFeatures(team: Team) {
    if (this.currentTeam?.code === team.code && this.currentRole && this.currentNickname) {
      this.setCurrentTeam(team, this.currentRole, this.currentNickname);
    }
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
    this.emitFeatures();
  }

  async fetchMyTeam(): Promise<Team | null> {
    return axiosInstance.get(this.myTeamUrl)
      .then((response) => {
        const team = response.data.team ? mapTeam(response.data.team as RawTeam) : null;
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
      .then((response) => (response.data.teams as RawTeamWithRole[]).map(mapTeamWithRole))
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

  async removeMember(code: string, userId: number): Promise<RemoveMemberResponse> {
    return apiRequest<RemoveMemberResponse>(
      axiosInstance.delete(`${this.teamUrl(code)}/members/${userId}`),
      (data) => ({success: true, members: (data.members as RawTeamMember[]).map(mapTeamMember)}),
    );
  }

  async updateMemberRole(code: string, userId: number, role: TeamRole): Promise<UpdateMemberRoleResponse> {
    return apiRequest<UpdateMemberRoleResponse>(
      axiosInstance.patch(`${this.teamUrl(code)}/members/${userId}/role`, {membership: {role}}),
      (data) => ({success: true, members: (data.members as RawTeamMember[]).map(mapTeamMember)}),
    );
  }

  async transferOwnership(code: string, userId: number): Promise<TransferOwnershipResponse> {
    return apiRequest<TransferOwnershipResponse>(
      axiosInstance.post(`${this.teamUrl(code)}/transfer_ownership`, {membership: {user_id: userId}}),
      (data) => {
        const role = data.role as TeamRole;
        if (this.currentTeam?.code === code) {
          this.currentRole = role;
          localStorage.setItem(this.teamRoleStorageKey, role);
        }
        return {success: true, members: (data.members as RawTeamMember[]).map(mapTeamMember), role};
      },
    );
  }

  async leaveTeam(code: string): Promise<LeaveTeamResponse> {
    return apiRequest<LeaveTeamResponse>(
      axiosInstance.post(`${this.teamUrl(code)}/leave`),
      () => {
        if (this.currentTeam?.code === code) {
          this.clearCurrentTeam();
        }
        return {success: true};
      },
    );
  }

  async renameTeam(code: string, name: string): Promise<RenameTeamResponse> {
    return apiRequest<RenameTeamResponse>(
      axiosInstance.patch(this.teamUrl(code), {team: {name}}),
      (data) => {
        const team = mapTeam(data.team as RawTeam);
        if (this.currentTeam?.code === code && this.currentRole && this.currentNickname) {
          this.setCurrentTeam(team, this.currentRole, this.currentNickname);
        }
        return {success: true, team};
      },
    );
  }

  async updateFeatures(code: string, features: Partial<TeamFeatures>): Promise<UpdateFeaturesResponse> {
    const payload: Partial<Record<keyof RawTeam, boolean>> = {};
    if (features.pages !== undefined) {
      payload.pages_enabled = features.pages;
    }
    if (features.diagrams !== undefined) {
      payload.diagrams_enabled = features.diagrams;
    }
    if (features.boards !== undefined) {
      payload.boards_enabled = features.boards;
    }

    return apiRequest<UpdateFeaturesResponse>(
      axiosInstance.patch(`${this.teamUrl(code)}/features`, {team: payload}),
      (data) => {
        const team = mapTeam(data.team as RawTeam);
        this.applyFeatures(team);
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


  private applyTeamResponse(data: RawActiveTeam) {
    const {team, role, nickname} = mapActiveTeam(data);
    this.setCurrentTeam(team, role, nickname);
    return {success: true as const, team, role, nickname};
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
    this.emitFeatures();
  }

  private emitFeatures() {
    const next = featuresOf(this.currentTeam);
    const current = this.featuresSubject.value;
    if (next.pages !== current.pages || next.diagrams !== current.diagrams || next.boards !== current.boards) {
      this.featuresSubject.next(next);
    }
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
