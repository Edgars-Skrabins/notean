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

export type CardResponse =
  | { success: true; card: CardDetail }
  | { success: false; statusMessage: string };

export type DeleteCardResponse =
  | { success: true }
  | { success: false; statusMessage: string };
