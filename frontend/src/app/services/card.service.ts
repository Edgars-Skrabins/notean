import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {CardDetail, CardResponse, DeleteCardResponse} from "@models/card.model";
import {mapBoardUser, mapCardSummary} from "@services/board.service";
import {RawAvatar} from "@services/avatar.service";
import {teamPath} from "@utils/teamPath";

interface RawCardDetail {
  id: number;
  title: string;
  position: number;
  description: string;
  column_id: number;
  creator: { id: number; nickname: string; avatar: RawAvatar };
  created_at: string;
  updated_at: string;
}

export function mapCardDetail(raw: RawCardDetail): CardDetail {
  return {
    ...mapCardSummary(raw),
    description: raw.description ?? '',
    columnId: raw.column_id,
    creator: mapBoardUser(raw.creator),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

@Injectable({
  providedIn: 'root',
})
export class CardService {
  private cardsUrl(teamCode: string, boardId: number) {
    return teamPath(teamCode, 'boards', boardId, 'cards');
  }

  async createCard(teamCode: string, boardId: number, columnId: number, title?: string): Promise<CardResponse> {
    return apiRequest<CardResponse>(
      axiosInstance.post(this.cardsUrl(teamCode, boardId), {card: {title, column_id: columnId}}),
      (data) => ({success: true, card: mapCardDetail(data.card)}),
    );
  }

  async getCard(teamCode: string, boardId: number, id: number): Promise<CardResponse> {
    return apiRequest<CardResponse>(
      axiosInstance.get(`${this.cardsUrl(teamCode, boardId)}/${id}`),
      (data) => ({success: true, card: mapCardDetail(data.card)}),
    );
  }

  async updateCard(teamCode: string, boardId: number, id: number, changes: { title?: string; description?: string }): Promise<CardResponse> {
    return apiRequest<CardResponse>(
      axiosInstance.patch(`${this.cardsUrl(teamCode, boardId)}/${id}`, {card: changes}),
      (data) => ({success: true, card: mapCardDetail(data.card)}),
    );
  }

  async moveCard(teamCode: string, boardId: number, id: number, move: { columnId: number; position: number }): Promise<CardResponse> {
    return apiRequest<CardResponse>(
      axiosInstance.patch(`${this.cardsUrl(teamCode, boardId)}/${id}`, {card: {column_id: move.columnId, position: move.position}}),
      (data) => ({success: true, card: mapCardDetail(data.card)}),
    );
  }

  async deleteCard(teamCode: string, boardId: number, id: number): Promise<DeleteCardResponse> {
    return apiRequest<DeleteCardResponse>(
      axiosInstance.delete(`${this.cardsUrl(teamCode, boardId)}/${id}`),
      () => ({success: true}),
    );
  }
}
