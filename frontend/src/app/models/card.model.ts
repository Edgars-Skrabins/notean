import {Result} from "@models/result.model";
import {BoardsErrorCode, CardsErrorCode, TeamAccessErrorCode} from "@config/errorCodes";
import {BoardUser} from './board.model';

export interface CardSummary {
  id: number;
  title: string;
  position: number;
}

export interface CardDetail extends CardSummary {
  description: string;
  columnId: number;
  creator: BoardUser;
  createdAt: string;
  updatedAt: string;
}

export type CardResponse = Result<{ card: CardDetail }, TeamAccessErrorCode | BoardsErrorCode | CardsErrorCode>;

export type DeleteCardResponse = Result<object, TeamAccessErrorCode | BoardsErrorCode | CardsErrorCode>;
