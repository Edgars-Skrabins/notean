import {AxiosResponse} from "axios";
import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {projectQuery} from "@utils/projectQuery";
import {mapBoardUser, RawBoardUser} from "@services/board.service";
import {
  ChatChannel,
  ChatChannelResponse,
  ChatChannelScope,
  ChatChannelsResponse,
  ChatChannelSummary,
  ChatEmptyResponse,
  ChatMessage,
  ChatMessageResponse,
  ChatMessagesResponse,
  ChatReaction,
  ChatReactionsResponse,
  CreateChatChannelParams,
  Gif,
  GifRating,
  GifSearchResponse,
  UpdateChatChannelParams
} from "@models/chat.model";

export interface RawChatChannelSummary {
  id: number;
  name: string;
  scope: ChatChannelScope;
  project_id: number | null;
  gif_rating: GifRating;
  created_by_user_id: number;
  last_message_at: string | null;
  created_at: string;
  unread_count?: number;
  can_manage?: boolean;
}

export interface RawChatChannel extends RawChatChannelSummary {
  project: { id: number; name: string } | null;
  members: RawBoardUser[];
}

export interface RawChatReaction {
  emoji: string;
  user_ids: number[];
}

export interface RawChatMessage {
  id: number;
  chat_channel_id: number;
  kind: 'text' | 'gif';
  body: string;
  gif: Gif | null;
  author: RawBoardUser;
  created_at: string;
  edited_at: string | null;
  reactions: RawChatReaction[];
}

export function mapChatChannelSummary(raw: RawChatChannelSummary): ChatChannelSummary {
  return {
    id: raw.id,
    name: raw.name,
    scope: raw.scope,
    projectId: raw.project_id,
    gifRating: raw.gif_rating,
    createdByUserId: raw.created_by_user_id,
    lastMessageAt: raw.last_message_at,
    createdAt: raw.created_at,
    unreadCount: raw.unread_count ?? 0,
    canManage: raw.can_manage ?? false,
  };
}

export function mapChatChannel(raw: RawChatChannel): ChatChannel {
  return {
    ...mapChatChannelSummary(raw),
    project: raw.project,
    members: raw.members.map(mapBoardUser),
  };
}

export function mapChatReaction(raw: RawChatReaction): ChatReaction {
  return {emoji: raw.emoji, userIds: raw.user_ids};
}

export function mapChatMessage(raw: RawChatMessage): ChatMessage {
  return {
    id: raw.id,
    chatChannelId: raw.chat_channel_id,
    kind: raw.kind,
    body: raw.body,
    gif: raw.gif,
    author: mapBoardUser(raw.author),
    createdAt: raw.created_at,
    editedAt: raw.edited_at,
    reactions: raw.reactions.map(mapChatReaction),
  };
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  async listChannels(teamCode: string, projectId: number | null): Promise<ChatChannelsResponse> {
    return apiRequest<ChatChannelsResponse>(
      axiosInstance.get(this.channelsUrl(teamCode), projectQuery(projectId)),
      (data) => ({
        success: true,
        channels: data.chat_channels.map(mapChatChannelSummary),
        creatableScopes: data.creatable_scopes,
        creatableProjectIds: data.creatable_project_ids,
      }),
    );
  }

  async getChannel(teamCode: string, id: number): Promise<ChatChannelResponse> {
    return this.requestChannel(axiosInstance.get(this.channelsUrl(teamCode, id)));
  }

  async createChannel(teamCode: string, params: CreateChatChannelParams): Promise<ChatChannelResponse> {
    return this.requestChannel(axiosInstance.post(this.channelsUrl(teamCode), {
      chat_channel: {name: params.name, scope: params.scope, project_id: params.projectId ?? null, member_ids: params.memberIds ?? []},
    }));
  }

  async updateChannel(teamCode: string, id: number, changes: UpdateChatChannelParams): Promise<ChatChannelResponse> {
    const payload: Record<string, unknown> = {};
    if (changes.name !== undefined) {
      payload['name'] = changes.name;
    }
    if (changes.gifRating !== undefined) {
      payload['gif_rating'] = changes.gifRating;
    }
    if (changes.memberIds !== undefined) {
      payload['member_ids'] = changes.memberIds;
    }
    return this.requestChannel(axiosInstance.patch(this.channelsUrl(teamCode, id), {chat_channel: payload}));
  }

  async deleteChannel(teamCode: string, id: number): Promise<ChatEmptyResponse> {
    return apiRequest<ChatEmptyResponse>(axiosInstance.delete(this.channelsUrl(teamCode, id)), () => ({success: true}));
  }

  async leaveChannel(teamCode: string, id: number): Promise<ChatEmptyResponse> {
    return apiRequest<ChatEmptyResponse>(axiosInstance.post(`${this.channelsUrl(teamCode, id)}/leave`), () => ({success: true}));
  }

  async markRead(teamCode: string, id: number, lastReadMessageId: number): Promise<ChatEmptyResponse> {
    return apiRequest<ChatEmptyResponse>(
      axiosInstance.post(`${this.channelsUrl(teamCode, id)}/read`, {last_read_message_id: lastReadMessageId}),
      () => ({success: true}),
    );
  }

  async listMessages(teamCode: string, channelId: number, cursor: { before?: number; around?: number } = {}): Promise<ChatMessagesResponse> {
    const params = cursor.around ? {around: cursor.around} : cursor.before ? {before: cursor.before} : undefined;
    return apiRequest<ChatMessagesResponse>(
      axiosInstance.get(this.messagesUrl(teamCode, channelId), params ? {params} : undefined),
      (data) => ({
        success: true,
        messages: data.messages.map(mapChatMessage),
        hasMoreBefore: data.has_more ?? data.has_more_before ?? false,
        hasMoreAfter: data.has_more_after ?? false,
        lastReadMessageId: data.last_read_message_id,
      }),
    );
  }

  async sendMessage(teamCode: string, channelId: number, body: string): Promise<ChatMessageResponse> {
    return this.requestMessage(axiosInstance.post(this.messagesUrl(teamCode, channelId), {message: {body}}));
  }

  async sendGif(teamCode: string, channelId: number, gifId: string): Promise<ChatMessageResponse> {
    return this.requestMessage(axiosInstance.post(this.messagesUrl(teamCode, channelId), {message: {gif_id: gifId}}));
  }

  async editMessage(teamCode: string, channelId: number, id: number, body: string): Promise<ChatMessageResponse> {
    return this.requestMessage(axiosInstance.patch(this.messagesUrl(teamCode, channelId, id), {message: {body}}));
  }

  async deleteMessage(teamCode: string, channelId: number, id: number): Promise<ChatEmptyResponse> {
    return apiRequest<ChatEmptyResponse>(axiosInstance.delete(this.messagesUrl(teamCode, channelId, id)), () => ({success: true}));
  }

  async addReaction(teamCode: string, channelId: number, messageId: number, emoji: string): Promise<ChatReactionsResponse> {
    return this.requestReactions(axiosInstance.post(this.reactionsUrl(teamCode, channelId, messageId), {reaction: {emoji}}));
  }

  async removeReaction(teamCode: string, channelId: number, messageId: number, emoji: string): Promise<ChatReactionsResponse> {
    return this.requestReactions(axiosInstance.delete(this.reactionsUrl(teamCode, channelId, messageId), {data: {reaction: {emoji}}}));
  }

  async searchGifs(teamCode: string, channelId: number, query: string, offset = 0, signal?: AbortSignal): Promise<GifSearchResponse> {
    return apiRequest<GifSearchResponse>(
      axiosInstance.get(teamPath(teamCode, 'chat_channels', channelId, 'gifs'), {params: {q: query, offset}, signal}),
      (data) => ({success: true, gifs: data.gifs, hasMore: data.has_more}),
    );
  }

  private requestChannel(request: Promise<AxiosResponse>): Promise<ChatChannelResponse> {
    return apiRequest<ChatChannelResponse>(request, (data) => ({success: true, channel: mapChatChannel(data.chat_channel)}));
  }

  private requestMessage(request: Promise<AxiosResponse>): Promise<ChatMessageResponse> {
    return apiRequest<ChatMessageResponse>(request, (data) => ({success: true, message: mapChatMessage(data.message)}));
  }

  private requestReactions(request: Promise<AxiosResponse>): Promise<ChatReactionsResponse> {
    return apiRequest<ChatReactionsResponse>(request, (data) => ({success: true, reactions: data.reactions.map(mapChatReaction)}));
  }

  private channelsUrl(teamCode: string, id?: number) {
    return id === undefined ? teamPath(teamCode, 'chat_channels') : teamPath(teamCode, 'chat_channels', id);
  }

  private messagesUrl(teamCode: string, channelId: number, id?: number) {
    return id === undefined ? teamPath(teamCode, 'chat_channels', channelId, 'messages') : teamPath(teamCode, 'chat_channels', channelId, 'messages', id);
  }

  private reactionsUrl(teamCode: string, channelId: number, messageId: number) {
    return teamPath(teamCode, 'chat_channels', channelId, 'messages', messageId, 'reactions');
  }
}
