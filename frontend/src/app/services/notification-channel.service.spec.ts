import {Subscription} from '@rails/actioncable';
import {NotificationChannelService} from "./notification-channel.service";
import {CableService} from "@services/cable.service";
import {NotificationService, RawNotification} from "@services/notification.service";
import {Notification} from "@models/notification.model";

const rawNotification: RawNotification = {
  id: 1,
  kind: 'assigned',
  item_type: 'Ticket',
  item_id: 4,
  item_title: 'Bug',
  board_id: 2,
  chat_channel_id: null,
  in_backlog: false,
  changed_fields: [],
  excerpt: null,
  event_count: 1,
  read: false,
  occurred_at: '2026-10-01T00:00:00Z',
  actor: {id: 5, nickname: 'bob', avatar: {color: 'red', image_url: null}},
};

describe('NotificationChannelService', () => {
  let subscription: jasmine.SpyObj<Subscription>;
  let cableService: jasmine.SpyObj<CableService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let service: NotificationChannelService;
  let count: number;

  beforeEach(() => {
    subscription = jasmine.createSpyObj<Subscription>('Subscription', ['unsubscribe', 'perform']);
    cableService = jasmine.createSpyObj<CableService>('CableService', ['subscribe', 'disconnect']);
    cableService.subscribe.and.returnValue(subscription);
    notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['unreadCount']);
    notificationService.unreadCount.and.returnValue(Promise.resolve({success: true, unreadCount: 4}));
    service = new NotificationChannelService(cableService, notificationService);
    service.unreadCount$.subscribe((value) => count = value);
  });

  it('subscribes to the user channel and loads the unread count', async () => {
    service.connect('abc');
    await Promise.resolve();

    expect(cableService.subscribe).toHaveBeenCalledOnceWith({channel: 'NotificationChannel'}, jasmine.any(Object));
    expect(notificationService.unreadCount).toHaveBeenCalledOnceWith('abc');
    expect(count).toBe(4);
  });

  it('applies the active team\'s messages and ignores other teams\'', () => {
    const upserted: Notification[] = [];
    service.upserted$.subscribe((notification) => upserted.push(notification));
    service.connect('abc');

    service.handleMessage({type: 'notification_upserted', team_code: 'other', notification: rawNotification, unread_count: 9});
    expect(upserted).toEqual([]);
    expect(count).not.toBe(9);

    service.handleMessage({type: 'notification_upserted', team_code: 'abc', notification: rawNotification, unread_count: 2});
    expect(upserted.map((notification) => notification.id)).toEqual([1]);
    expect(count).toBe(2);
  });

  it('passes on read changes and removals with their counts', () => {
    const reads: unknown[] = [];
    const removed: number[][] = [];
    service.read$.subscribe((change) => reads.push(change));
    service.removed$.subscribe((ids) => removed.push(ids));
    service.connect('abc');

    service.handleMessage({type: 'notifications_read', team_code: 'abc', ids: 'all', read: true, unread_count: 0});
    service.handleMessage({type: 'notification_removed', team_code: 'abc', ids: [3], unread_count: 1});

    expect(reads).toEqual([{ids: 'all', read: true}]);
    expect(removed).toEqual([[3]]);
    expect(count).toBe(1);
  });

  it('clear unsubscribes and resets the count', () => {
    service.connect('abc');
    service.setUnreadCount(6);

    service.clear();

    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(count).toBe(0);
  });
});
