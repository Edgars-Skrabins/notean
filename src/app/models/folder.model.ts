export type FolderItemType = 'Page' | 'Diagram';

export interface FolderUser {
  id: number;
  username: string;
}

export interface FolderSummary {
  id: number;
  title: string;
  parentId: number | null;
  creator: FolderUser;
  createdAt: string;
  updatedAt: string;
}

export type ListFoldersResponse =
  | { success: true; folders: FolderSummary[] }
  | { success: false; statusMessage: string };

export type FolderResponse =
  | { success: true; folder: FolderSummary }
  | { success: false; statusMessage: string };

export type DeleteFolderResponse =
  | { success: true }
  | { success: false; statusMessage: string };
