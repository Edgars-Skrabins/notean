import {Result} from "@models/result.model";
import {TeamAccessErrorCode} from "@config/errorCodes";
import {BoardUser} from "@models/board.model";

export interface MyWorkTicket {
  id: number;
  title: string;
  boardId: number;
  boardTitle: string;
  columnId: number | null;
  columnTitle: string | null;
  assignees: BoardUser[];
  updatedAt: string;
}

export interface MyWorkGroup {
  boardId: number;
  boardTitle: string;
  tickets: MyWorkTicket[];
}

export type MyWorkResponse = Result<{ tickets: MyWorkTicket[] }, TeamAccessErrorCode>;
