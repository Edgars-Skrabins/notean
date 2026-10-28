import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {mapBoardUser, RawBoardUser} from "@services/board.service";
import {
  Comment,
  CommentPin,
  CommentPinResponse,
  CommentPinsResponse,
  CommentResponse,
  CommentsResponse,
  CommentTarget,
  CreateCommentPinResponse,
  DeleteCommentResponse,
} from "@models/comment.model";

export interface RawComment {
  id: number;
  body: string;
  created_at: string;
  edited_at: string | null;
  author: RawBoardUser;
}

export interface RawCommentPin {
  id: number;
  x: number;
  y: number;
  resolved_at: string | null;
  resolved_by: RawBoardUser | null;
  created_by: RawBoardUser;
  comment_count: number;
  first_comment: RawComment | null;
}

export function mapComment(raw: RawComment): Comment {
  return {
    id: raw.id,
    body: raw.body,
    createdAt: raw.created_at,
    editedAt: raw.edited_at,
    author: mapBoardUser(raw.author),
  };
}

export function mapCommentPin(raw: RawCommentPin): CommentPin {
  return {
    id: raw.id,
    x: raw.x,
    y: raw.y,
    resolvedAt: raw.resolved_at,
    resolvedBy: raw.resolved_by ? mapBoardUser(raw.resolved_by) : null,
    createdBy: mapBoardUser(raw.created_by),
    commentCount: raw.comment_count,
    firstComment: raw.first_comment ? mapComment(raw.first_comment) : null,
  };
}

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  async list(teamCode: string, target: CommentTarget, beforeId?: number): Promise<CommentsResponse> {
    return apiRequest<CommentsResponse>(
      axiosInstance.get(this.commentsUrl(teamCode, target), {params: beforeId === undefined ? {} : {before_id: beforeId}}),
      (data) => ({success: true, comments: data.comments.map(mapComment), hasMore: data.has_more}),
    );
  }

  async create(teamCode: string, target: CommentTarget, body: string): Promise<CommentResponse> {
    return apiRequest<CommentResponse>(
      axiosInstance.post(this.commentsUrl(teamCode, target), {comment: {body}}),
      (data) => ({success: true, comment: mapComment(data.comment)}),
    );
  }

  async update(teamCode: string, id: number, body: string): Promise<CommentResponse> {
    return apiRequest<CommentResponse>(
      axiosInstance.patch(teamPath(teamCode, 'comments', id), {comment: {body}}),
      (data) => ({success: true, comment: mapComment(data.comment)}),
    );
  }

  async delete(teamCode: string, id: number): Promise<DeleteCommentResponse> {
    return apiRequest<DeleteCommentResponse>(
      axiosInstance.delete(teamPath(teamCode, 'comments', id)),
      (data) => ({success: true, commentPinDeleted: data?.comment_pin_deleted === true}),
    );
  }

  async listPins(teamCode: string, diagramId: number): Promise<CommentPinsResponse> {
    return apiRequest<CommentPinsResponse>(
      axiosInstance.get(teamPath(teamCode, 'diagrams', diagramId, 'comment_pins')),
      (data) => ({success: true, commentPins: data.comment_pins.map(mapCommentPin)}),
    );
  }

  async createPin(teamCode: string, diagramId: number, x: number, y: number, body: string): Promise<CreateCommentPinResponse> {
    return apiRequest<CreateCommentPinResponse>(
      axiosInstance.post(teamPath(teamCode, 'diagrams', diagramId, 'comment_pins'), {comment_pin: {x, y, body}}),
      (data) => ({success: true, commentPin: mapCommentPin(data.comment_pin), comment: mapComment(data.comment)}),
    );
  }

  async setPinResolved(teamCode: string, pinId: number, resolved: boolean): Promise<CommentPinResponse> {
    return apiRequest<CommentPinResponse>(
      axiosInstance.patch(teamPath(teamCode, 'comment_pins', pinId), {comment_pin: {resolved}}),
      (data) => ({success: true, commentPin: mapCommentPin(data.comment_pin)}),
    );
  }

  private commentsUrl(teamCode: string, target: CommentTarget): string {
    switch (target.type) {
      case 'ticket':
        return teamPath(teamCode, 'boards', target.boardId, 'tickets', target.ticketId, 'comments');
      case 'page':
        return teamPath(teamCode, 'pages', target.pageId, 'comments');
      case 'commentPin':
        return teamPath(teamCode, 'comment_pins', target.pinId, 'comments');
    }
  }
}
