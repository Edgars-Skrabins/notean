import {Result} from "@models/result.model";
import {BoardUser} from "@models/board.model";
import {ChatErrorCode, ProjectsErrorCode, TeamAccessErrorCode} from "@config/errorCodes";

export type ChatChannelScope = 'team' | 'project' | 'users';

export type GifRating = 'pg' | 'pg-13';

export const GIF_RATINGS: GifRating[] = ['pg', 'pg-13'];

export interface ChatChannelSummary {
  id: number;
  name: string;
  scope: ChatChannelScope;
  projectId: number | null;
  gifRating: GifRating;
  createdByUserId: number;
  lastMessageAt: string | null;
  createdAt: string;
  unreadCount: number;
  canManage: boolean;
}

export interface ChatChannel extends ChatChannelSummary {
  project: { id: number; name: string } | null;
  members: BoardUser[];
}

export interface Gif {
  id: string;
  url: string;
  width: number;
  height: number;
  title: string;
}

export interface ChatReaction {
  emoji: string;
  userIds: number[];
}

export type ChatMessageKind = 'text' | 'gif';

export interface ChatMessage {
  id: number;
  chatChannelId: number;
  kind: ChatMessageKind;
  body: string;
  gif: Gif | null;
  author: BoardUser;
  createdAt: string;
  editedAt: string | null;
  reactions: ChatReaction[];
}

export interface ChatChannelListing {
  channels: ChatChannelSummary[];
  creatableScopes: ChatChannelScope[];
  creatableProjectIds: number[];
}

export interface CreateChatChannelParams {
  name: string;
  scope: ChatChannelScope;
  projectId?: number | null;
  memberIds?: number[];
}

export interface UpdateChatChannelParams {
  name?: string;
  gifRating?: GifRating;
  memberIds?: number[];
}

export interface ChatMessagePage {
  messages: ChatMessage[];
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
  lastReadMessageId: number;
}

export type ChatErrors = TeamAccessErrorCode | ChatErrorCode | ProjectsErrorCode;

export type ChatChannelsResponse = Result<ChatChannelListing, ChatErrors>;

export type ChatChannelResponse = Result<{ channel: ChatChannel }, ChatErrors>;

export type ChatEmptyResponse = Result<object, ChatErrors>;

export type ChatMessagesResponse = Result<ChatMessagePage, ChatErrors>;

export type ChatMessageResponse = Result<{ message: ChatMessage }, ChatErrors>;

export type ChatReactionsResponse = Result<{ reactions: ChatReaction[] }, ChatErrors>;

export type GifSearchResponse = Result<{ gifs: Gif[]; hasMore: boolean }, ChatErrors>;
