import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {toErrorResult} from "@utils/httpError";
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
    return `/teams/${teamCode}/boards`;
  }

  async listBoards(teamCode: string, search?: string): Promise<ListBoardsResponse> {
    return axiosInstance.get(this.boardsUrl(teamCode), {params: search ? {search} : undefined})
      .then((response) => {
        const boards = (response.data.boards ?? response.data) as RawBoardSummary[];
        return {success: true, boards: boards.map(mapBoardSummary)} satisfies ListBoardsResponse;
      })
      .catch((error) => toErrorResult<ListBoardsResponse>(error, 'Failed to load boards'));
  }

  async createBoard(teamCode: string, title?: string): Promise<BoardResponse> {
    return axiosInstance.post(this.boardsUrl(teamCode), {board: {title}})
      .then((response) => {
        return {success: true, board: mapBoardDetail(response.data.board)} satisfies BoardResponse;
      })
      .catch((error) => toErrorResult<BoardResponse>(error, 'Failed to create board'));
  }

  async getBoard(teamCode: string, id: number): Promise<BoardResponse> {
    return axiosInstance.get(`${this.boardsUrl(teamCode)}/${id}`)
      .then((response) => {
        return {success: true, board: mapBoardDetail(response.data.board)} satisfies BoardResponse;
      })
      .catch((error) => toErrorResult<BoardResponse>(error, 'Failed to load board'));
  }

  async renameBoard(teamCode: string, id: number, title: string): Promise<BoardResponse> {
    return axiosInstance.patch(`${this.boardsUrl(teamCode)}/${id}`, {board: {title}})
      .then((response) => {
        return {success: true, board: mapBoardDetail(response.data.board)} satisfies BoardResponse;
      })
      .catch((error) => toErrorResult<BoardResponse>(error, 'Failed to rename board'));
  }

  async deleteBoard(teamCode: string, id: number): Promise<DeleteBoardResponse> {
    return axiosInstance.delete(`${this.boardsUrl(teamCode)}/${id}`)
      .then(() => {
        return {success: true} satisfies DeleteBoardResponse;
      })
      .catch((error) => toErrorResult<DeleteBoardResponse>(error, 'Failed to delete board'));
  }
}
