import {Avatar} from "@models/avatar.model";

export interface DiagramUser {
  id: number;
  nickname: string;
  avatar: Avatar;
}

export interface DiagramEditingUser {
  id: number;
  nickname: string;
}

export interface DiagramSummary {
  id: number;
  title: string;
  folderId: number | null;
  creator: DiagramUser;
  createdAt: string;
  updatedAt: string;
}

export interface DiagramDetail extends DiagramSummary {
  content: string;
  contributors: DiagramUser[];
  currentlyEditing: DiagramEditingUser | null;
}

export interface SaveDiagramParams {
  title: string;
  content: string;
}

export type ListDiagramsResponse =
  | { success: true; diagrams: DiagramSummary[] }
  | { success: false; statusMessage: string };

export type DiagramResponse =
  | { success: true; diagram: DiagramDetail }
  | { success: false; statusMessage: string };

export type DeleteDiagramResponse =
  | { success: true }
  | { success: false; statusMessage: string };
