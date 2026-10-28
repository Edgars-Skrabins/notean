import {Result} from "@models/result.model";
import {BoardUser} from "@models/board.model";
import {
  BoardsErrorCode,
  CommentsErrorCode,
  DiagramsErrorCode,
  PagesErrorCode,
  TeamAccessErrorCode,
  TicketsErrorCode,
} from "@config/errorCodes";

export interface Comment {
  id: number;
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: BoardUser;
}

export interface CommentPin {
  id: number;
  x: number;
  y: number;
  resolvedAt: string | null;
  resolvedBy: BoardUser | null;
  createdBy: BoardUser;
  commentCount: number;
  firstComment: Comment | null;
}

export type CommentTarget =
  | { type: 'ticket'; boardId: number; ticketId: number }
  | { type: 'page'; pageId: number }
  | { type: 'commentPin'; pinId: number };

type CommentErrorCode = TeamAccessErrorCode | BoardsErrorCode | TicketsErrorCode | PagesErrorCode | DiagramsErrorCode | CommentsErrorCode;

export type CommentsResponse = Result<{ comments: Comment[]; hasMore: boolean }, CommentErrorCode>;

export type CommentResponse = Result<{ comment: Comment }, CommentErrorCode>;

export type DeleteCommentResponse = Result<{ commentPinDeleted: boolean }, CommentErrorCode>;

export type CommentPinsResponse = Result<{ commentPins: CommentPin[] }, CommentErrorCode>;

export type CommentPinResponse = Result<{ commentPin: CommentPin }, CommentErrorCode>;

export type CreateCommentPinResponse = Result<{ commentPin: CommentPin; comment: Comment }, CommentErrorCode>;
