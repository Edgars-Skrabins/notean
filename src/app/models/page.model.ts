export interface PageUser {
  id: number;
  username: string;
}

export interface PageSummary {
  id: number;
  title: string;
  creator: PageUser;
  createdAt: string;
  updatedAt: string;
}

export interface PageDetail extends PageSummary {
  content: string;
  contributors: PageUser[];
  currentlyEditing: PageUser | null;
}

export interface SavePageParams {
  title: string;
  content: string;
}

export type ListPagesResponse =
  | { success: true; pages: PageSummary[] }
  | { success: false; statusMessage: string };

export type PageResponse =
  | { success: true; page: PageDetail }
  | { success: false; statusMessage: string };

export type DeletePageResponse =
  | { success: true }
  | { success: false; statusMessage: string };
