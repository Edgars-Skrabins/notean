import {AxiosResponse} from "axios";
import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {BoardPriority, PrioritiesResponse, PriorityColor, PriorityResponse} from "@models/priority.model";

export interface RawBoardPriority {
  id: number;
  name: string;
  color: PriorityColor;
  position: number;
  ticket_count: number;
}

export function mapBoardPriority(raw: RawBoardPriority): BoardPriority {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color,
    position: raw.position,
    ticketCount: raw.ticket_count,
  };
}

@Injectable({
  providedIn: 'root',
})
export class PriorityService {
  async create(teamCode: string, boardId: number, name: string, color: PriorityColor): Promise<PriorityResponse> {
    return apiRequest<PriorityResponse>(
      axiosInstance.post(this.prioritiesUrl(teamCode, boardId), {priority: {name, color}}),
      (data) => ({success: true, priority: mapBoardPriority(data.priority)}),
    );
  }

  async update(teamCode: string, boardId: number, id: number, changes: { name?: string; color?: PriorityColor; position?: number }): Promise<PrioritiesResponse> {
    return this.requestPriorities(axiosInstance.patch(this.prioritiesUrl(teamCode, boardId, id), {priority: changes}));
  }

  async delete(teamCode: string, boardId: number, id: number): Promise<PrioritiesResponse> {
    return this.requestPriorities(axiosInstance.delete(this.prioritiesUrl(teamCode, boardId, id)));
  }

  private requestPriorities(request: Promise<AxiosResponse>): Promise<PrioritiesResponse> {
    return apiRequest<PrioritiesResponse>(
      request,
      (data) => ({success: true, priorities: data.priorities.map(mapBoardPriority)}),
    );
  }

  private prioritiesUrl(teamCode: string, boardId: number, id?: number) {
    return id === undefined ? teamPath(teamCode, 'boards', boardId, 'priorities') : teamPath(teamCode, 'boards', boardId, 'priorities', id);
  }
}
