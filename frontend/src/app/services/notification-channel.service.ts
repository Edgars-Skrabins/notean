import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {CableService, CableSubscription} from "@services/cable.service";
import {mapNotification, NotificationService, RawNotification} from "@services/notification.service";
import {Notification} from "@models/notification.model";

type NotificationChannelMessage =
  | { type: 'notification_upserted'; team_code: string; notification: RawNotification; unread_count: number }
  | { type: 'notifications_read'; team_code: string; ids: number[] | 'all'; read: boolean; unread_count: number }
  | { type: 'notification_removed'; team_code: string; ids: number[]; unread_count: number };

export interface NotificationsRead {
  ids: number[] | 'all';
  read: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationChannelService {
  private subscription: CableSubscription | null = null;
  private teamCode: string | null = null;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private upsertedSubject = new Subject<Notification>();
  private readSubject = new Subject<NotificationsRead>();
  private removedSubject = new Subject<number[]>();

  readonly unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();
  readonly upserted$: Observable<Notification> = this.upsertedSubject.asObservable();
  readonly read$: Observable<NotificationsRead> = this.readSubject.asObservable();
  readonly removed$: Observable<number[]> = this.removedSubject.asObservable();

  constructor(private cableService: CableService, private notificationService: NotificationService) {
  }

  connect(teamCode: string) {
    this.disconnect();
    this.teamCode = teamCode;

    this.subscription = this.cableService.subscribe(
      {channel: 'NotificationChannel'},
      {
        received: (data: NotificationChannelMessage) => this.handleMessage(data),
      }
    );
    this.loadUnreadCount(teamCode);
  }

  handleMessage(data: NotificationChannelMessage) {
    if (data.team_code !== this.teamCode) {
      return;
    }

    this.unreadCountSubject.next(data.unread_count);
    if (data.type === 'notification_upserted') {
      this.upsertedSubject.next(mapNotification(data.notification));
    } else if (data.type === 'notifications_read') {
      this.readSubject.next({ids: data.ids, read: data.read});
    } else if (data.type === 'notification_removed') {
      this.removedSubject.next(data.ids);
    }
  }

  setUnreadCount(count: number) {
    this.unreadCountSubject.next(count);
  }

  disconnect() {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.teamCode = null;
  }

  clear() {
    this.disconnect();
    this.unreadCountSubject.next(0);
  }

  private async loadUnreadCount(teamCode: string) {
    const response = await this.notificationService.unreadCount(teamCode);
    if (response.success && this.teamCode === teamCode) {
      this.unreadCountSubject.next(response.unreadCount);
    }
  }
}
