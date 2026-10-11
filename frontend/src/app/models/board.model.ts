import {Result} from "@models/result.model";
import {BoardsErrorCode, TeamAccessErrorCode} from "@config/errorCodes";
import {TicketSummary} from './ticket.model';
import {Avatar} from "@models/avatar.model";

export interface BoardUser {
  id: number;
  nickname: string;
  avatar: Avatar;
}

export interface BoardColumn {
  id: number;
  title: string;
  position: number;
  tickets: TicketSummary[];
}

export interface BoardSummary {
  id: number;
  title: string;
  creator: BoardUser;
  createdAt: string;
  updatedAt: string;
}

export interface BoardDetail extends BoardSummary {
  columns: BoardColumn[];
  backlog: TicketSummary[];
}

export interface BoardOverviewColumn {
  id: number;
  title: string;
  ticketCount: number;
}

export interface RecentTicket {
  id: number;
  title: string;
  columnId: number | null;
  columnTitle: string | null;
  updatedAt: string;
}

export interface AssigneeCount {
  user: BoardUser | null;
  ticketCount: number;
}

export interface BoardOverview {
  totalTickets: number;
  boardTickets: number;
  backlogTickets: number;
  columns: BoardOverviewColumn[];
  createdLast7Days: number;
  updatedLast7Days: number;
  recentTickets: RecentTicket[];
  assignees: AssigneeCount[];
}

export type ListBoardsResponse = Result<{ boards: BoardSummary[] }, TeamAccessErrorCode>;

export type BoardResponse = Result<{ board: BoardDetail }, TeamAccessErrorCode | BoardsErrorCode>;

export type BoardOverviewResponse = Result<{ overview: BoardOverview }, TeamAccessErrorCode | BoardsErrorCode>;

export type DeleteBoardResponse = Result<object, TeamAccessErrorCode | BoardsErrorCode>;

export type ColumnResponse = Result<{ column: BoardColumn }, TeamAccessErrorCode | BoardsErrorCode>;

export type DeleteColumnResponse = Result<object, TeamAccessErrorCode | BoardsErrorCode>;
