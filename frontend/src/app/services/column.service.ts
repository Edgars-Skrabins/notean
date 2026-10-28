import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {ColumnResponse, DeleteColumnResponse} from "@models/board.model";
import {mapBoardColumn} from "@services/board.service";
import {teamPath} from "@utils/teamPath";

@Injectable({
  providedIn: 'root',
})
export class ColumnService {
  private columnsUrl(teamCode: string, boardId: number) {
    return teamPath(teamCode, 'boards', boardId, 'columns');
  }

  async createColumn(teamCode: string, boardId: number, title?: string): Promise<ColumnResponse> {
    return apiRequest<ColumnResponse>(
      axiosInstance.post(this.columnsUrl(teamCode, boardId), {column: {title}}),
      (data) => ({success: true, column: mapBoardColumn(data.column)}),
    );
  }

  async renameColumn(teamCode: string, boardId: number, id: number, title: string): Promise<ColumnResponse> {
    return apiRequest<ColumnResponse>(
      axiosInstance.patch(`${this.columnsUrl(teamCode, boardId)}/${id}`, {column: {title}}),
      (data) => ({success: true, column: mapBoardColumn(data.column)}),
    );
  }

  async deleteColumn(teamCode: string, boardId: number, id: number): Promise<DeleteColumnResponse> {
    return apiRequest<DeleteColumnResponse>(
      axiosInstance.delete(`${this.columnsUrl(teamCode, boardId)}/${id}`),
      (data) => ({success: true, trashEntryIds: data.trash_entry_ids ?? []}),
    );
  }
}
