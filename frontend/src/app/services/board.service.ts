import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {
  BoardColumn,
  BoardDetail,
  BoardResponse,
  BoardSummary,
  BoardUser,
  DeleteBoardResponse,
  ListBoardsResponse,
} from "@models/board.model";
import {CardSummary} from "@models/card.model";
import {mapAvatar, RawAvatar} from "@services/avatar.service";
import {teamPath} from "@utils/teamPath";

interface RawBoardUser {
  id: number;
  nickname: string;
  avatar: RawAvatar;
}

interface RawCardSummary {
  id: number;
  title: string;
  position: number;
}

interface RawBoardColumn {
  id: number;
  title: string;
  position: number;
  cards?: RawCardSummary[];
}

interface RawBoardSummary {
  id: number;
  title: string;
  creator: RawBoardUser;
  created_at: string;
  updated_at: string;
}

interface RawBoardDetail extends RawBoardSummary {
  columns: RawBoardColumn[];
}

export function mapBoardUser(raw: RawBoardUser): BoardUser {
  return {
    id: raw.id,
    nickname: raw.nickname,
    avatar: mapAvatar(raw.avatar),
  };
}

export function mapCardSummary(raw: RawCardSummary): CardSummary {
  return {
    id: raw.id,
    title: raw.title,
    position: raw.position,
  };
}

export function mapBoardColumn(raw: RawBoardColumn): BoardColumn {
  return {
    id: raw.id,
    title: raw.title,
    position: raw.position,
    cards: (raw.cards ?? []).map(mapCardSummary),
  };
}

export function mapBoardSummary(raw: RawBoardSummary): BoardSummary {
  return {
    id: raw.id,
    title: raw.title,
    creator: mapBoardUser(raw.creator),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function mapBoardDetail(raw: RawBoardDetail): BoardDetail {
  return {
    ...mapBoardSummary(raw),
    columns: raw.columns.map(mapBoardColumn),
  };
}

@Injectable({
  providedIn: 'root',
})
export class BoardService {
  private boardsUrl(teamCode: string) {
    return teamPath(teamCode, 'boards');
  }

  async listBoards(teamCode: string, search?: string): Promise<ListBoardsResponse> {
    return apiRequest<ListBoardsResponse>(
      axiosInstance.get(this.boardsUrl(teamCode), {params: search ? {search} : undefined}),
      (data) => {
        const boards = data.boards as RawBoardSummary[];
        return {success: true, boards: boards.map(mapBoardSummary)};
      },
    );
  }

  async createBoard(teamCode: string, title?: string): Promise<BoardResponse> {
    return apiRequest<BoardResponse>(
      axiosInstance.post(this.boardsUrl(teamCode), {board: {title}}),
      (data) => ({success: true, board: mapBoardDetail(data.board)}),
    );
  }

  async getBoard(teamCode: string, id: number): Promise<BoardResponse> {
    return apiRequest<BoardResponse>(
      axiosInstance.get(`${this.boardsUrl(teamCode)}/${id}`),
      (data) => ({success: true, board: mapBoardDetail(data.board)}),
    );
  }

  async renameBoard(teamCode: string, id: number, title: string): Promise<BoardResponse> {
    return apiRequest<BoardResponse>(
      axiosInstance.patch(`${this.boardsUrl(teamCode)}/${id}`, {board: {title}}),
      (data) => ({success: true, board: mapBoardDetail(data.board)}),
    );
  }

  async deleteBoard(teamCode: string, id: number): Promise<DeleteBoardResponse> {
    return apiRequest<DeleteBoardResponse>(
      axiosInstance.delete(`${this.boardsUrl(teamCode)}/${id}`),
      () => ({success: true}),
    );
  }
}
