import {EditConflict, Result} from "@models/result.model";
import {BoardsErrorCode, TicketsErrorCode, TeamAccessErrorCode} from "@config/errorCodes";
import {BoardUser} from './board.model';
import {Attachment} from './attachment.model';

export interface TicketSummary {
  id: number;
  title: string;
  position: number;
  columnId: number | null;
  priorityId: number | null;
  lockVersion: number;
  assignees: BoardUser[];
  tagIds: number[];
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  boardId: number;
  creator: BoardUser;
  attachments: Attachment[];
}

export interface TicketStatus {
  columnId: number | null;
  title: string;
}

export interface TicketStatusGroup {
  status: TicketStatus;
  tickets: TicketSummary[];
}

export interface TicketFilters {
  assigneeIds: Set<number | 'none'>;
  tagIds: Set<number | 'none'>;
  columnIds: Set<number | null>;
}

export interface TicketChange {
  upserted: TicketSummary[];
  removedIds: number[];
}

export interface TicketShift {
  columnId: number | null;
  fromPosition: number;
  toPosition: number | null;
  delta: number;
}

export interface ListTicketsParams {
  status: number | 'backlog';
  search?: string;
  assigneeIds?: (number | 'none')[];
  tagIds?: (number | 'none')[];
  offset?: number;
}

export type ListTicketsResponse = Result<{ tickets: TicketSummary[], hasMore: boolean }, TeamAccessErrorCode | BoardsErrorCode | TicketsErrorCode>;

export type TicketResponse = Result<{ ticket: TicketDetail }, TeamAccessErrorCode | BoardsErrorCode | TicketsErrorCode>;

export type UpdateTicketResponse = TicketResponse | EditConflict<TicketDetail>;

export type BulkTicketAction = { columnId: number } | { toBacklog: true } | { addAssigneeId: number } | { removeAssigneeId: number };

export type BulkTicketsResponse = Result<{ tickets: TicketSummary[] }, TeamAccessErrorCode | BoardsErrorCode | TicketsErrorCode>;

export type DeleteTicketResponse = Result<{ trashEntryIds: number[] }, TeamAccessErrorCode | BoardsErrorCode | TicketsErrorCode>;
