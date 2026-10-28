import {ChatChannelSummary, ChatMessage} from "@models/chat.model";

export function testChatChannel(overrides: Partial<ChatChannelSummary> = {}): ChatChannelSummary {
  return {
    id: 1,
    name: 'General',
    scope: 'team',
    projectId: null,
    gifRating: 'pg',
    createdByUserId: 1,
    lastMessageAt: null,
    createdAt: '2026-10-01T00:00:00Z',
    unreadCount: 0,
    canManage: false,
    ...overrides,
  };
}

export function testChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 1,
    chatChannelId: 1,
    kind: 'text',
    body: 'Hello',
    gif: null,
    author: {id: 2, nickname: 'bob', avatar: {color: 'red', imageUrl: null}},
    createdAt: '2026-10-01T10:00:00Z',
    editedAt: null,
    reactions: [],
    ...overrides,
  };
}
