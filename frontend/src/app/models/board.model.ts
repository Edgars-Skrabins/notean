import {Result} from "@models/result.model";
import {BoardsErrorCode, TeamAccessErrorCode} from "@config/errorCodes";
import {CardSummary} from './card.model';
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
  cards: CardSummary[];
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
}

export type ListBoardsResponse = Result<{ boards: BoardSummary[] }, TeamAccessErrorCode>;

export type BoardResponse = Result<{ board: BoardDetail }, TeamAccessErrorCode | BoardsErrorCode>;

export type DeleteBoardResponse = Result<object, TeamAccessErrorCode | BoardsErrorCode>;

export type ColumnResponse = Result<{ column: BoardColumn }, TeamAccessErrorCode | BoardsErrorCode>;

export type DeleteColumnResponse = Result<object, TeamAccessErrorCode | BoardsErrorCode>;
