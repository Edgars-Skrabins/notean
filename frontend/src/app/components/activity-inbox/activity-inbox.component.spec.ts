import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {BehaviorSubject, Subject} from 'rxjs';
import {provideTranslateService} from '@ngx-translate/core';
import {ActivityInboxComponent} from './activity-inbox.component';
import {NotificationService} from '@services/notification.service';
import {NotificationChannelService, NotificationsRead} from '@services/notification-channel.service';
import {TeamService} from '@services/team.service';
import {Notification, NotificationsResponse} from '@models/notification.model';
import {PHRASES} from '@config/phrases';
import {AppRoutes} from '../../app/app-routes.enum';
import {testNotification} from '../../testing/notificationFixtures';

describe('ActivityInboxComponent', () => {
  let fixture: ComponentFixture<ActivityInboxComponent>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let router: jasmine.SpyObj<Router>;
  let channel: {
    unreadCount$: BehaviorSubject<number>;
    upserted$: Subject<Notification>;
    read$: Subject<NotificationsRead>;
    removed$: Subject<number[]>;
    setUnreadCount: jasmine.Spy;
  };

  function page(notifications: Notification[], hasMore = false): NotificationsResponse {
    return {success: true, notifications, hasMore, unreadCount: notifications.filter((notification) => !notification.read).length};
  }

  async function render(response: NotificationsResponse) {
    notificationService.list.and.returnValue(Promise.resolve(response));
    fixture = TestBed.createComponent(ActivityInboxComponent);
    fixture.detectChanges();
    await settle();
  }

  async function settle() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function rowIds(): number[] {
    return fixture.componentInstance.notifications.map((notification) => notification.id);
  }

  function message(): string {
    return (fixture.nativeElement.querySelector('.activityInbox__message') as HTMLElement | null)?.textContent!.trim() ?? '';
  }

  beforeEach(async () => {
    notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['list', 'setRead', 'readAll']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    channel = {
      unreadCount$: new BehaviorSubject(0),
      upserted$: new Subject(),
      read$: new Subject(),
      removed$: new Subject(),
      setUnreadCount: jasmine.createSpy('setUnreadCount'),
    };
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');

    await TestBed.configureTestingModule({
      imports: [ActivityInboxComponent],
      providers: [
        provideTranslateService(),
        {provide: NotificationService, useValue: notificationService},
        {provide: NotificationChannelService, useValue: channel},
        {provide: TeamService, useValue: teamService},
        {provide: Router, useValue: router},
      ],
    }).compileComponents();
  });

  it('shows the empty states for All and Unread', async () => {
    await render(page([]));
    expect(message()).toBe(PHRASES.ACTIVITY_EMPTY);

    fixture.componentInstance.selectFilter('unread');
    await settle();

    expect(notificationService.list).toHaveBeenCalledWith('abc', 0, true);
    expect(message()).toBe(PHRASES.ACTIVITY_ALL_CAUGHT_UP);
  });

  it('shows the translated error when loading fails', async () => {
    await render({success: false, code: 'NETWORK_ERROR'});

    expect(message()).toBe('ERRORS.COMMON.NETWORK_ERROR');
  });

  it('loads the next page after the loaded rows without duplicates', async () => {
    await render(page([testNotification({id: 1})], true));
    notificationService.list.and.returnValue(Promise.resolve(page([testNotification({id: 1}), testNotification({id: 2})])));

    fixture.componentInstance.loadMore();
    await settle();

    expect(notificationService.list).toHaveBeenCalledWith('abc', 1, false);
    expect(rowIds()).toEqual([1, 2]);
    expect(fixture.componentInstance.hasMore).toBeFalse();
  });

  it('opening marks the row read, updates the count and navigates to the item', async () => {
    const notification = testNotification({id: 4, itemType: 'Page', itemId: 9});
    await render(page([notification]));
    notificationService.setRead.and.returnValue(Promise.resolve({success: true, notification: {...notification, read: true}, unreadCount: 0}));

    fixture.componentInstance.handleOpen(notification);
    await settle();

    expect(notificationService.setRead).toHaveBeenCalledOnceWith('abc', 4, true);
    expect(channel.setUnreadCount).toHaveBeenCalledWith(0);
    expect(fixture.componentInstance.notifications[0].read).toBeTrue();
    expect(router.navigate).toHaveBeenCalledOnceWith([AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, 9], {queryParams: undefined});
  });

  it('opening a deleted item only marks it read', async () => {
    const notification = testNotification({kind: 'item_deleted', itemId: null, read: true});
    await render(page([notification]));

    fixture.componentInstance.handleOpen(notification);

    expect(notificationService.setRead).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('mark all read marks every loaded row read', async () => {
    await render(page([testNotification({id: 1}), testNotification({id: 2})]));
    notificationService.readAll.and.returnValue(Promise.resolve({success: true, unreadCount: 0}));

    await fixture.componentInstance.markAllRead();

    expect(fixture.componentInstance.notifications.every((notification) => notification.read)).toBeTrue();
    expect(channel.setUnreadCount).toHaveBeenCalledWith(0);
  });

  it('applies live upserts, reads and removals', async () => {
    await render(page([testNotification({id: 1}), testNotification({id: 2})]));

    channel.upserted$.next(testNotification({id: 2, eventCount: 2}));
    channel.upserted$.next(testNotification({id: 3}));
    expect(rowIds()).toEqual([3, 2, 1]);
    expect(fixture.componentInstance.notifications[1].eventCount).toBe(2);

    channel.read$.next({ids: [1], read: true});
    expect(fixture.componentInstance.notifications.find((notification) => notification.id === 1)!.read).toBeTrue();

    channel.removed$.next([2, 3]);
    expect(rowIds()).toEqual([1]);
  });
});
