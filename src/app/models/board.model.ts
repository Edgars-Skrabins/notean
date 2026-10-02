export interface BoardUser {
  id: number;
  username: string;
}

export interface BoardColumn {
  id: number;
  title: string;
  position: number;
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

export type ListBoardsResponse =
  | { success: true; boards: BoardSummary[] }
  | { success: false; statusMessage: string };

export type BoardResponse =
  | { success: true; board: BoardDetail }
  | { success: false; statusMessage: string };

export type DeleteBoardResponse =
  | { success: true }
  | { success: false; statusMessage: string };

export type ColumnResponse =
  | { success: true; column: BoardColumn }
  | { success: false; statusMessage: string };

export type DeleteColumnResponse =
  | { success: true }
  | { success: false; statusMessage: string };
