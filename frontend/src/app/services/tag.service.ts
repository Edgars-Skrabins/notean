import {AxiosResponse} from "axios";
import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {PriorityColor} from "@models/priority.model";
import {Tag, TagResponse, TagsResponse, TicketTagResponse} from "@models/tag.model";
import {mapTicketDetail} from "@services/ticket.service";

export interface RawTag {
  id: number;
  name: string;
  color: PriorityColor;
  ticket_count: number;
}

export function mapTag(raw: RawTag): Tag {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color,
    ticketCount: raw.ticket_count,
  };
}

@Injectable({
  providedIn: 'root',
})
export class TagService {
  async create(teamCode: string, boardId: number, name: string, color?: PriorityColor): Promise<TagResponse> {
    return apiRequest<TagResponse>(
      axiosInstance.post(this.tagsUrl(teamCode, boardId), {tag: {name, color}}),
      (data) => ({success: true, tag: mapTag(data.tag)}),
    );
  }

  async update(teamCode: string, boardId: number, id: number, changes: { name?: string; color?: PriorityColor }): Promise<TagsResponse> {
    return this.requestTags(axiosInstance.patch(this.tagsUrl(teamCode, boardId, id), {tag: changes}));
  }

  async remove(teamCode: string, boardId: number, id: number): Promise<TagsResponse> {
    return this.requestTags(axiosInstance.delete(this.tagsUrl(teamCode, boardId, id)));
  }

  async addToTicket(teamCode: string, boardId: number, ticketId: number, tagId: number): Promise<TicketTagResponse> {
    return this.requestTicket(axiosInstance.post(this.ticketTagsUrl(teamCode, boardId, ticketId), {tag: {tag_id: tagId}}));
  }

  async removeFromTicket(teamCode: string, boardId: number, ticketId: number, tagId: number): Promise<TicketTagResponse> {
    return this.requestTicket(axiosInstance.delete(`${this.ticketTagsUrl(teamCode, boardId, ticketId)}/${tagId}`));
  }

  private requestTags(request: Promise<AxiosResponse>): Promise<TagsResponse> {
    return apiRequest<TagsResponse>(
      request,
      (data) => ({success: true, tags: data.tags.map(mapTag)}),
    );
  }

  private requestTicket(request: Promise<AxiosResponse>): Promise<TicketTagResponse> {
    return apiRequest<TicketTagResponse>(
      request,
      (data) => ({success: true, ticket: mapTicketDetail(data.ticket)}),
    );
  }

  private ticketTagsUrl(teamCode: string, boardId: number, ticketId: number) {
    return teamPath(teamCode, 'boards', boardId, 'tickets', ticketId, 'tags');
  }

  private tagsUrl(teamCode: string, boardId: number, id?: number) {
    return id === undefined ? teamPath(teamCode, 'boards', boardId, 'tags') : teamPath(teamCode, 'boards', boardId, 'tags', id);
  }
}
