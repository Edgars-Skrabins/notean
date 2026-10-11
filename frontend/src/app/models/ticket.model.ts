import {Result} from "@models/result.model";
import {BoardsErrorCode, TicketsErrorCode, TeamAccessErrorCode} from "@config/errorCodes";
import {BoardUser} from './board.model';

export interface TicketSummary {
  id: number;
  title: string;
  position: number;
  columnId: number | null;
  assignees: BoardUser[];
  updatedAt: string;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  boardId: number;
  creator: BoardUser;
  createdAt: string;
}

export type TicketResponse = Result<{ ticket: TicketDetail }, TeamAccessErrorCode | BoardsErrorCode | TicketsErrorCode>;

export type DeleteTicketResponse = Result<object, TeamAccessErrorCode | BoardsErrorCode | TicketsErrorCode>;
