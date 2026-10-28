import {Result} from "@models/result.model";
import {BoardsErrorCode, TagsErrorCode, TeamAccessErrorCode, TicketsErrorCode} from "@config/errorCodes";
import {PriorityColor} from "@models/priority.model";
import {TicketDetail} from "@models/ticket.model";

export const TAG_NAME_MAX_LENGTH = 24;

export interface Tag {
  id: number;
  name: string;
  color: PriorityColor;
  ticketCount: number;
}

export type TagResponse = Result<{ tag: Tag }, TeamAccessErrorCode | BoardsErrorCode | TagsErrorCode>;

export type TagsResponse = Result<{ tags: Tag[] }, TeamAccessErrorCode | BoardsErrorCode | TagsErrorCode>;

export type TicketTagResponse = Result<{ ticket: TicketDetail }, TeamAccessErrorCode | BoardsErrorCode | TicketsErrorCode | TagsErrorCode>;
