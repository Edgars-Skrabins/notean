import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {ColumnResponse, DeleteColumnResponse} from "@models/board.model";
import {mapBoardColumn} from "@services/board.service";

@Injectable({
  providedIn: 'root',
})
export class ColumnService {
  private columnsUrl(teamCode: string, boardId: number) {
    return `/teams/${teamCode}/boards/${boardId}/columns`;
  }

  async createColumn(teamCode: string, boardId: number, title?: string): Promise<ColumnResponse> {
    return axiosInstance.post(this.columnsUrl(teamCode, boardId), {column: {title}})
      .then((response) => {
        return {success: true, column: mapBoardColumn(response.data.column)} satisfies ColumnResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to create column';
        return {success: false, statusMessage} satisfies ColumnResponse;
      });
  }

  async renameColumn(teamCode: string, boardId: number, id: number, title: string): Promise<ColumnResponse> {
    return axiosInstance.patch(`${this.columnsUrl(teamCode, boardId)}/${id}`, {column: {title}})
      .then((response) => {
        return {success: true, column: mapBoardColumn(response.data.column)} satisfies ColumnResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to rename column';
        return {success: false, statusMessage} satisfies ColumnResponse;
      });
  }

  async deleteColumn(teamCode: string, boardId: number, id: number): Promise<DeleteColumnResponse> {
    return axiosInstance.delete(`${this.columnsUrl(teamCode, boardId)}/${id}`)
      .then(() => {
        return {success: true} satisfies DeleteColumnResponse;
      })
      .catch((error) => {
        const statusMessage = error.response?.data?.statusMessage ?? 'Failed to delete column';
        return {success: false, statusMessage} satisfies DeleteColumnResponse;
      });
  }
}
