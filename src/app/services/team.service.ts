import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {
  CreateTeamParams,
  CreateTeamResponse,
  JoinTeamParams,
  JoinTeamResponse,
  Team
} from "@models/team.model";

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private createTeamUrl = '/teams';
  private joinTeamUrl = '/actions/jointeam';
  private myTeamUrl = '/teams/mine';
  private teamStorageKey = 'currentTeam';

  private currentTeam: Team | null = this.readStoredTeam();

  getCurrentTeam(): Team | null {
    return this.currentTeam;
  }

  clearCurrentTeam() {
    this.currentTeam = null;
    localStorage.removeItem(this.teamStorageKey);
  }

  async fetchMyTeam(): Promise<Team | null> {
    return axiosInstance.get(this.myTeamUrl)
      .then((response) => {
        const team = response.data.team as Team | null;
        if (team) {
          this.setCurrentTeam(team);
        }
        return team;
      })
      .catch(() => null);
  }

  async createTeam(params: CreateTeamParams): Promise<CreateTeamResponse> {
    return axiosInstance.post(this.createTeamUrl, {team: params})
      .then((response) => {
        const team = response.data.team as Team;
        this.setCurrentTeam(team);
        return {success: true, team} satisfies CreateTeamResponse;
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
        this.setCurrentTeam(team);
        return {success: true, team} satisfies JoinTeamResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to join team';
        return {success: false, statusMessage} satisfies JoinTeamResponse;
      });
  }

  private setCurrentTeam(team: Team) {
    this.currentTeam = team;
    localStorage.setItem(this.teamStorageKey, JSON.stringify(team));
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
}
