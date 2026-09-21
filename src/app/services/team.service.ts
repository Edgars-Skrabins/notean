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
  private teamsUrl = '/teams';

  async createTeam(params: CreateTeamParams): Promise<CreateTeamResponse> {
    return axiosInstance.post(this.teamsUrl, params)
      .then((response) => {
        return {success: true, team: response.data.team as Team} satisfies CreateTeamResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to create team';
        return {success: false, statusMessage} satisfies CreateTeamResponse;
      });
  }

  async joinTeam(params: JoinTeamParams): Promise<JoinTeamResponse> {
    return axiosInstance.post(`${this.teamsUrl}/join`, params)
      .then(() => {
        return {success: true} satisfies JoinTeamResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to join team';
        return {success: false, statusMessage} satisfies JoinTeamResponse;
      });
  }
}
