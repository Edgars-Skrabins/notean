import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {
  BoardColumn,
  BoardDetail,
  BoardOverview,
  BoardOverviewResponse,
  BoardResponse,
  BoardSummary,
  BoardUser,
  DeleteBoardResponse,
  ListBoardsResponse,
} from "@models/board.model";
import {TicketSummary} from "@models/ticket.model";
import {mapAvatar, RawAvatar} from "@services/avatar.service";
import {teamPath} from "@utils/teamPath";
import {projectQuery} from "@utils/projectQuery";

export interface RawBoardUser {
  id: number;
  nickname: string;
  avatar: RawAvatar;
}

export interface RawTicketSummary {
  id: number;
  title: string;
  position: number;
  column_id: number | null;
  assignees: RawBoardUser[];
  updated_at: string;
}

interface RawBoardColumn {
  id: number;
  title: string;
  position: number;
  tickets?: RawTicketSummary[];
}

interface RawBoardSummary {
  id: number;
  title: string;
  project_id: number | null;
  creator: RawBoardUser;
  created_at: string;
  updated_at: string;
}

interface RawBoardDetail extends RawBoardSummary {
  columns: RawBoardColumn[];
  backlog?: RawTicketSummary[];
}

interface RawBoardOverview {
  total_tickets: number;
  board_tickets: number;
  backlog_tickets: number;
  columns: { id: number; title: string; ticket_count: number }[];
  created_last_7_days: number;
  updated_last_7_days: number;
  recent_tickets: { id: number; title: string; column_id: number | null; column_title: string | null; updated_at: string }[];
  assignees: { user: RawBoardUser | null; ticket_count: number }[];
}

export function mapBoardUser(raw: RawBoardUser): BoardUser {
  return {
    id: raw.id,
    nickname: raw.nickname,
    avatar: mapAvatar(raw.avatar),
  };
}

export function mapTicketSummary(raw: RawTicketSummary): TicketSummary {
  return {
    id: raw.id,
    title: raw.title,
    position: raw.position,
    columnId: raw.column_id,
    assignees: raw.assignees.map(mapBoardUser),
    updatedAt: raw.updated_at,
  };
}

export function mapBoardColumn(raw: RawBoardColumn): BoardColumn {
  return {
    id: raw.id,
    title: raw.title,
    position: raw.position,
    tickets: (raw.tickets ?? []).map(mapTicketSummary),
  };
}

export function mapBoardSummary(raw: RawBoardSummary): BoardSummary {
  return {
    id: raw.id,
    title: raw.title,
    projectId: raw.project_id,
    creator: mapBoardUser(raw.creator),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function mapBoardDetail(raw: RawBoardDetail): BoardDetail {
  return {
    ...mapBoardSummary(raw),
    columns: raw.columns.map(mapBoardColumn),
    backlog: (raw.backlog ?? []).map(mapTicketSummary),
  };
}

export function mapBoardOverview(raw: RawBoardOverview): BoardOverview {
  return {
    totalTickets: raw.total_tickets,
    boardTickets: raw.board_tickets,
    backlogTickets: raw.backlog_tickets,
    columns: raw.columns.map((column) => ({id: column.id, title: column.title, ticketCount: column.ticket_count})),
    createdLast7Days: raw.created_last_7_days,
    updatedLast7Days: raw.updated_last_7_days,
    recentTickets: raw.recent_tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      columnId: ticket.column_id,
      columnTitle: ticket.column_title,
      updatedAt: ticket.updated_at,
    })),
    assignees: raw.assignees.map((row) => ({user: row.user ? mapBoardUser(row.user) : null, ticketCount: row.ticket_count})),
  };
}

@Injectable({
  providedIn: 'root',
})
export class BoardService {
  private boardsUrl(teamCode: string) {
    return teamPath(teamCode, 'boards');
  }

  async listBoards(teamCode: string, projectId: number | null = null): Promise<ListBoardsResponse> {
    return apiRequest<ListBoardsResponse>(
      axiosInstance.get(this.boardsUrl(teamCode), projectQuery(projectId)),
      (data) => {
        const boards = data.boards as RawBoardSummary[];
        return {success: true, boards: boards.map(mapBoardSummary)};
      },
    );
  }

  async createBoard(teamCode: string, title: string, projectId: number | null = null): Promise<BoardResponse> {
    return apiRequest<BoardResponse>(
      axiosInstance.post(this.boardsUrl(teamCode), {board: {title, project_id: projectId}}),
      (data) => ({success: true, board: mapBoardDetail(data.board)}),
    );
  }

  async getBoard(teamCode: string, id: number): Promise<BoardResponse> {
    return apiRequest<BoardResponse>(
      axiosInstance.get(`${this.boardsUrl(teamCode)}/${id}`),
      (data) => ({success: true, board: mapBoardDetail(data.board)}),
    );
  }

  async setBoardProject(teamCode: string, id: number, projectId: number | null): Promise<BoardResponse> {
    return apiRequest<BoardResponse>(
      axiosInstance.patch(`${this.boardsUrl(teamCode)}/${id}`, {board: {project_id: projectId}}),
      (data) => ({success: true, board: mapBoardDetail(data.board)}),
    );
  }

  async renameBoard(teamCode: string, id: number, title: string): Promise<BoardResponse> {
    return apiRequest<BoardResponse>(
      axiosInstance.patch(`${this.boardsUrl(teamCode)}/${id}`, {board: {title}}),
      (data) => ({success: true, board: mapBoardDetail(data.board)}),
    );
  }

  async getOverview(teamCode: string, id: number): Promise<BoardOverviewResponse> {
    return apiRequest<BoardOverviewResponse>(
      axiosInstance.get(`${this.boardsUrl(teamCode)}/${id}/overview`),
      (data) => ({success: true, overview: mapBoardOverview(data.overview)}),
    );
  }

  async deleteBoard(teamCode: string, id: number): Promise<DeleteBoardResponse> {
    return apiRequest<DeleteBoardResponse>(
      axiosInstance.delete(`${this.boardsUrl(teamCode)}/${id}`),
      () => ({success: true}),
    );
  }
}
