import {AxiosResponse} from "axios";
import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest, versionedRequest} from "@utils/apiRequest";
import {BulkTicketAction, BulkTicketsResponse, ListTicketsParams, ListTicketsResponse, TicketDetail, TicketResponse, DeleteTicketResponse, UpdateTicketResponse} from "@models/ticket.model";
import {mapBoardUser, mapTicketSummary, RawBoardUser, RawTicketSummary} from "@services/board.service";
import {teamPath} from "@utils/teamPath";

interface RawTicketDetail extends RawTicketSummary {
  description: string | null;
  board_id: number;
  creator: RawBoardUser;
}

export function mapTicketDetail(raw: RawTicketDetail): TicketDetail {
  return {
    ...mapTicketSummary(raw),
    description: raw.description ?? '',
    boardId: raw.board_id,
    creator: mapBoardUser(raw.creator),
  };
}

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  async list(teamCode: string, boardId: number, {status, search, assigneeIds, tagIds, offset}: ListTicketsParams): Promise<ListTicketsResponse> {
    const params = {status, search: search || undefined, assignee_ids: assigneeIds?.length ? assigneeIds : undefined, tag_ids: tagIds?.length ? tagIds : undefined, offset: offset || undefined};
    return apiRequest<ListTicketsResponse>(
      axiosInstance.get(this.ticketsUrl(teamCode, boardId), {params}),
      (data) => ({success: true, tickets: data.tickets.map(mapTicketSummary), hasMore: data.has_more}),
    );
  }

  async createTicket(teamCode: string, boardId: number, title: string, columnId: number | null): Promise<TicketResponse> {
    return this.requestTicket(axiosInstance.post(this.ticketsUrl(teamCode, boardId), {ticket: {title, column_id: columnId}}));
  }

  async getTicket(teamCode: string, boardId: number, id: number): Promise<TicketResponse> {
    return this.requestTicket(axiosInstance.get(this.ticketsUrl(teamCode, boardId, id)));
  }

  async updateTicket(teamCode: string, boardId: number, id: number, changes: { title?: string; description?: string; priorityId?: number | null; lockVersion?: number }): Promise<UpdateTicketResponse> {
    const {priorityId, lockVersion, ...rest} = changes;
    const ticket = {
      ...rest,
      ...(priorityId === undefined ? {} : {priority_id: priorityId}),
      ...(lockVersion === undefined ? {} : {lock_version: lockVersion}),
    };
    return versionedRequest<TicketResponse, TicketDetail>(
      axiosInstance.patch(this.ticketsUrl(teamCode, boardId, id), {ticket}),
      (data) => ({success: true, ticket: mapTicketDetail(data.ticket)}),
      (data) => mapTicketDetail(data.ticket),
    );
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
      (data) => ({success: true, trashEntryIds: data.trash_entry_ids ?? []}),
    );
  }

  async bulkUpdate(teamCode: string, boardId: number, ticketIds: number[], action: BulkTicketAction): Promise<BulkTicketsResponse> {
    return apiRequest<BulkTicketsResponse>(
      axiosInstance.patch(this.bulkUrl(teamCode, boardId), {bulk: {ticket_ids: ticketIds, ...this.bulkActionParams(action)}}),
      (data) => ({success: true, tickets: data.tickets.map(mapTicketSummary)}),
    );
  }

  async bulkDelete(teamCode: string, boardId: number, ticketIds: number[]): Promise<DeleteTicketResponse> {
    return apiRequest<DeleteTicketResponse>(
      axiosInstance.delete(this.bulkUrl(teamCode, boardId), {data: {bulk: {ticket_ids: ticketIds}}}),
      (data) => ({success: true, trashEntryIds: data.trash_entry_ids ?? []}),
    );
  }

  private bulkActionParams(action: BulkTicketAction): object {
    if ('columnId' in action) {
      return {column_id: action.columnId};
    }
    if ('toBacklog' in action) {
      return {to_backlog: true};
    }
    if ('addAssigneeId' in action) {
      return {add_assignee_id: action.addAssigneeId};
    }
    return {remove_assignee_id: action.removeAssigneeId};
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

  private bulkUrl(teamCode: string, boardId: number) {
    return teamPath(teamCode, 'boards', boardId, 'tickets', 'bulk');
  }

  private assigneesUrl(teamCode: string, boardId: number, ticketId: number) {
    return teamPath(teamCode, 'boards', boardId, 'tickets', ticketId, 'assignees');
  }

  private ticketsUrl(teamCode: string, boardId: number, id?: number) {
    return id === undefined ? teamPath(teamCode, 'boards', boardId, 'tickets') : teamPath(teamCode, 'boards', boardId, 'tickets', id);
  }
}
