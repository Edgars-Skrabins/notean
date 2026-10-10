import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {toErrorResult} from "@utils/httpError";
import {CardDetail, CardResponse, DeleteCardResponse} from "@models/card.model";
import {mapBoardUser, mapCardSummary} from "@services/board.service";
import {RawAvatar} from "@services/avatar.service";

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
    return `/teams/${teamCode}/boards/${boardId}/cards`;
  }

  async createCard(teamCode: string, boardId: number, columnId: number, title?: string): Promise<CardResponse> {
    return axiosInstance.post(this.cardsUrl(teamCode, boardId), {card: {title, column_id: columnId}})
      .then((response) => {
        return {success: true, card: mapCardDetail(response.data.card)} satisfies CardResponse;
      })
      .catch((error) => toErrorResult<CardResponse>(error, 'Failed to create card'));
  }

  async getCard(teamCode: string, boardId: number, id: number): Promise<CardResponse> {
    return axiosInstance.get(`${this.cardsUrl(teamCode, boardId)}/${id}`)
      .then((response) => {
        return {success: true, card: mapCardDetail(response.data.card)} satisfies CardResponse;
      })
      .catch((error) => toErrorResult<CardResponse>(error, 'Failed to load card'));
  }

  async updateCard(teamCode: string, boardId: number, id: number, changes: { title?: string; description?: string }): Promise<CardResponse> {
    return axiosInstance.patch(`${this.cardsUrl(teamCode, boardId)}/${id}`, {card: changes})
      .then((response) => {
        return {success: true, card: mapCardDetail(response.data.card)} satisfies CardResponse;
      })
      .catch((error) => toErrorResult<CardResponse>(error, 'Failed to update card'));
  }

  async moveCard(teamCode: string, boardId: number, id: number, move: { columnId: number; position: number }): Promise<CardResponse> {
    return axiosInstance.patch(`${this.cardsUrl(teamCode, boardId)}/${id}`, {card: {column_id: move.columnId, position: move.position}})
      .then((response) => {
        return {success: true, card: mapCardDetail(response.data.card)} satisfies CardResponse;
      })
      .catch((error) => toErrorResult<CardResponse>(error, 'Failed to move card'));
  }

  async deleteCard(teamCode: string, boardId: number, id: number): Promise<DeleteCardResponse> {
    return axiosInstance.delete(`${this.cardsUrl(teamCode, boardId)}/${id}`)
      .then(() => {
        return {success: true} satisfies DeleteCardResponse;
      })
      .catch((error) => toErrorResult<DeleteCardResponse>(error, 'Failed to delete card'));
  }
}
