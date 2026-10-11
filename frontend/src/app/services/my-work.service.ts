import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {projectQuery} from "@utils/projectQuery";
import {mapBoardUser, RawBoardUser} from "@services/board.service";
import {MyWorkGroup, MyWorkResponse, MyWorkTicket} from "@models/my-work.model";

interface RawMyWorkTicket {
  id: number;
  title: string;
  board_id: number;
  board_title: string;
  column_id: number | null;
  column_title: string | null;
  assignees: RawBoardUser[];
  updated_at: string;
}

export function mapMyWorkTicket(raw: RawMyWorkTicket): MyWorkTicket {
  return {
    id: raw.id,
    title: raw.title,
    boardId: raw.board_id,
    boardTitle: raw.board_title,
    columnId: raw.column_id,
    columnTitle: raw.column_title,
    assignees: raw.assignees.map(mapBoardUser),
    updatedAt: raw.updated_at,
  };
}

export function groupMyWork(tickets: MyWorkTicket[]): MyWorkGroup[] {
  const groups = new Map<number, MyWorkGroup>();
  for (const ticket of tickets) {
    const group = groups.get(ticket.boardId) ?? {boardId: ticket.boardId, boardTitle: ticket.boardTitle, tickets: []};
    group.tickets.push(ticket);
    groups.set(ticket.boardId, group);
  }
  return [...groups.values()];
}

@Injectable({
  providedIn: 'root',
})
export class MyWorkService {
  async listMyWork(teamCode: string, projectId: number | null = null): Promise<MyWorkResponse> {
    return apiRequest<MyWorkResponse>(
      axiosInstance.get(teamPath(teamCode, 'my_work'), projectQuery(projectId)),
      (data) => ({success: true, tickets: (data.tickets as RawMyWorkTicket[]).map(mapMyWorkTicket)}),
    );
  }
}
