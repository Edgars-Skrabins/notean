import {axiosInstance} from "@config/axiosConfig";
import {mapNotification, NotificationService, RawNotification} from "./notification.service";

function raw(overrides: Partial<RawNotification> = {}): RawNotification {
  return {
    id: 1,
    kind: 'item_changed',
    item_type: 'Ticket',
    item_id: 4,
    item_title: 'Bug',
    board_id: 2,
    in_backlog: true,
    changed_fields: ['title', 'status'],
    excerpt: null,
    event_count: 3,
    read: false,
    occurred_at: '2026-10-01T00:00:00Z',
    actor: {id: 5, nickname: 'bob', avatar: {color: 'red', image_url: null}},
    ...overrides,
  };
}

describe('mapNotification', () => {
  it('maps snake_case fields and the actor', () => {
    expect(mapNotification(raw())).toEqual({
      id: 1,
      kind: 'item_changed',
      itemType: 'Ticket',
      itemId: 4,
      itemTitle: 'Bug',
      boardId: 2,
      inBacklog: true,
      changedFields: ['title', 'status'],
      excerpt: null,
      eventCount: 3,
      read: false,
      occurredAt: '2026-10-01T00:00:00Z',
      actor: {id: 5, nickname: 'bob', avatar: {color: 'red', imageUrl: null}},
    });
  });
});

describe('NotificationService', () => {
  it('lists a page, asking for unread ones only when requested', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {notifications: [raw()], has_more: true, unread_count: 7}}));

    const response = await new NotificationService().list('abc', 50, true);
    await new NotificationService().list('abc', 0, false);

    expect(get).toHaveBeenCalledWith('/teams/abc/notifications', {params: {offset: 50, unread: true}});
    expect(get).toHaveBeenCalledWith('/teams/abc/notifications', {params: {offset: 0}});
    expect(response).toEqual(jasmine.objectContaining({success: true, hasMore: true, unreadCount: 7}));
  });

  it('marks one notification read and returns the new count', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {notification: raw({read: true}), unread_count: 0}}));

    const response = await new NotificationService().setRead('abc', 1, true);

    expect(patch).toHaveBeenCalledWith('/teams/abc/notifications/1', {notification: {read: true}});
    expect(response).toEqual(jasmine.objectContaining({success: true, unreadCount: 0}));
  });
});
