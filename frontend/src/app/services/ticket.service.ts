import {AxiosResponse} from "axios";
import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {TicketDetail, TicketResponse, DeleteTicketResponse} from "@models/ticket.model";
import {mapBoardUser, mapTicketSummary, RawBoardUser, RawTicketSummary} from "@services/board.service";
import {teamPath} from "@utils/teamPath";

interface RawTicketDetail extends RawTicketSummary {
  description: string | null;
  board_id: number;
  creator: RawBoardUser;
  created_at: string;
}

export function mapTicketDetail(raw: RawTicketDetail): TicketDetail {
  return {
    ...mapTicketSummary(raw),
    description: raw.description ?? '',
    boardId: raw.board_id,
    creator: mapBoardUser(raw.creator),
    createdAt: raw.created_at,
  };
}

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  async createTicket(teamCode: string, boardId: number, title: string, columnId: number | null): Promise<TicketResponse> {
    return this.requestTicket(axiosInstance.post(this.ticketsUrl(teamCode, boardId), {ticket: {title, column_id: columnId}}));
  }

  async getTicket(teamCode: string, boardId: number, id: number): Promise<TicketResponse> {
    return this.requestTicket(axiosInstance.get(this.ticketsUrl(teamCode, boardId, id)));
  }

  async updateTicket(teamCode: string, boardId: number, id: number, changes: { title?: string; description?: string }): Promise<TicketResponse> {
    return this.patchTicket(teamCode, boardId, id, changes);
  }

  async moveTicket(teamCode: string, boardId: number, id: number, move: { columnId: number; position?: number }): Promise<TicketResponse> {
    return this.patchTicket(teamCode, boardId, id, {column_id: move.columnId, position: move.position});
  }

  async moveToBacklog(teamCode: string, boardId: number, id: number, position?: number): Promise<TicketResponse> {
    return this.patchTicket(teamCode, boardId, id, {to_backlog: true, position});
  }

  async reorderBacklog(teamCode: string, boardId: number, id: number, position: number): Promise<TicketResponse> {
    return this.patchTicket(teamCode, boardId, id, {position});
  }

  async addAssignee(teamCode: string, boardId: number, ticketId: number, userId: number): Promise<TicketResponse> {
    return this.requestTicket(axiosInstance.post(this.assigneesUrl(teamCode, boardId, ticketId), {assignee: {user_id: userId}}));
  }

  async removeAssignee(teamCode: string, boardId: number, ticketId: number, userId: number): Promise<TicketResponse> {
    return this.requestTicket(axiosInstance.delete(`${this.assigneesUrl(teamCode, boardId, ticketId)}/${userId}`));
  }

  async deleteTicket(teamCode: string, boardId: number, id: number): Promise<DeleteTicketResponse> {
    return apiRequest<DeleteTicketResponse>(
      axiosInstance.delete(this.ticketsUrl(teamCode, boardId, id)),
      () => ({success: true}),
    );
  }

  private patchTicket(teamCode: string, boardId: number, id: number, changes: object): Promise<TicketResponse> {
    return this.requestTicket(axiosInstance.patch(this.ticketsUrl(teamCode, boardId, id), {ticket: changes}));
  }

  private requestTicket(request: Promise<AxiosResponse>): Promise<TicketResponse> {
    return apiRequest<TicketResponse>(
      request,
      (data) => ({success: true, ticket: mapTicketDetail(data.ticket)}),
    );
  }

  private assigneesUrl(teamCode: string, boardId: number, ticketId: number) {
    return teamPath(teamCode, 'boards', boardId, 'tickets', ticketId, 'assignees');
  }

  private ticketsUrl(teamCode: string, boardId: number, id?: number) {
    return id === undefined ? teamPath(teamCode, 'boards', boardId, 'tickets') : teamPath(teamCode, 'boards', boardId, 'tickets', id);
  }
}
