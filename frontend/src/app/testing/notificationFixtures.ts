import {Notification} from "@models/notification.model";

export function testNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 1,
    kind: 'assigned',
    itemType: 'Ticket',
    itemId: 10,
    itemTitle: 'Fix login',
    boardId: 3,
    chatChannelId: null,
    inBacklog: false,
    changedFields: [],
    excerpt: null,
    eventCount: 1,
    read: false,
    occurredAt: '2026-10-01T00:00:00Z',
    actor: {id: 5, nickname: 'Bob', avatar: {color: 'red', imageUrl: null}},
    ...overrides,
  };
}
