import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {Router} from '@angular/router';
import {AsyncPipe, NgFor, NgIf} from '@angular/common';
import {Subscription} from 'rxjs';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {NotificationService} from '@services/notification.service';
import {NotificationChannelService, NotificationsRead} from '@services/notification-channel.service';
import {TeamService} from '@services/team.service';
import {Notification} from '@models/notification.model';
import {ActivityRowComponent} from '@components/activity-row/activity-row.component';
import {LoadMoreComponent} from '@components/load-more/load-more.component';
import {errorPhrase} from '@utils/errorPhrase';
import {notificationRoute} from '@utils/notificationRoute';

export type ActivityFilter = 'all' | 'unread';

@Component({
  selector: 'app-activity-inbox',
  imports: [
    AsyncPipe,
    NgFor,
    NgIf,
    TranslatePipe,
    ActivityRowComponent,
    LoadMoreComponent
  ],
  templateUrl: './activity-inbox.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './activity-inbox.component.css'
})
export class ActivityInboxComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly filters: { value: ActivityFilter, phrase: string }[] = [
    {value: 'all', phrase: PHRASES.ACTIVITY_ALL},
    {value: 'unread', phrase: PHRASES.ACTIVITY_UNREAD},
  ];

  filter: ActivityFilter = 'all';
  notifications: Notification[] = [];
  hasMore = false;
  isLoading = true;
  isLoadingMore = false;
  errorMessage: string | null = null;

  private subscriptions: Subscription[] = [];
  private loadId = 0;

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    protected notificationChannelService: NotificationChannelService,
    private teamService: TeamService
  ) {
  }

  ngOnInit() {
    this.load();
    this.subscriptions = [
      this.notificationChannelService.upserted$.subscribe((notification) => this.applyUpserted(notification)),
      this.notificationChannelService.read$.subscribe((change) => this.applyRead(change)),
      this.notificationChannelService.removed$.subscribe((ids) => this.notifications = this.notifications.filter((notification) => !ids.includes(notification.id))),
    ];
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  selectFilter(filter: ActivityFilter) {
    if (filter === this.filter) {
      return;
    }

    this.filter = filter;
    this.notifications = [];
    this.isLoading = true;
    this.load();
  }

  loadMore() {
    this.isLoadingMore = true;
    this.load();
  }

  async markAllRead() {
    const response = await this.notificationService.readAll(this.teamService.getCurrentTeamCode());
    if (!response.success) {
      this.errorMessage = errorPhrase(response.code);
      return;
    }

    this.applyRead({ids: 'all', read: true});
    this.notificationChannelService.setUnreadCount(response.unreadCount);
  }

  handleOpen(notification: Notification) {
    if (!notification.read) {
      this.setRead(notification, true);
    }

    const route = notificationRoute(notification);
    if (route) {
      this.router.navigate(route);
    }
  }

  handleToggleRead(notification: Notification) {
    this.setRead(notification, !notification.read);
  }

  private async setRead(notification: Notification, read: boolean) {
    const response = await this.notificationService.setRead(this.teamService.getCurrentTeamCode(), notification.id, read);
    if (!response.success) {
      this.errorMessage = errorPhrase(response.code);
      return;
    }

    this.applyRead({ids: [notification.id], read});
    this.notificationChannelService.setUnreadCount(response.unreadCount);
  }

  private async load() {
    const loadId = ++this.loadId;
    const response = await this.notificationService.list(this.teamService.getCurrentTeamCode(), this.notifications.length, this.filter === 'unread');
    if (loadId !== this.loadId) {
      return;
    }

    this.isLoading = false;
    this.isLoadingMore = false;
    if (!response.success) {
      this.errorMessage = errorPhrase(response.code);
      return;
    }

    this.errorMessage = null;
    const loadedIds = new Set(this.notifications.map((notification) => notification.id));
    this.notifications = [...this.notifications, ...response.notifications.filter((notification) => !loadedIds.has(notification.id))];
    this.hasMore = response.hasMore;
    this.notificationChannelService.setUnreadCount(response.unreadCount);
  }

  private applyUpserted(notification: Notification) {
    this.notifications = [notification, ...this.notifications.filter((loaded) => loaded.id !== notification.id)];
  }

  private applyRead(change: NotificationsRead) {
    this.notifications = this.notifications.map((notification) =>
      change.ids === 'all' || change.ids.includes(notification.id) ? {...notification, read: change.read} : notification
    );
  }
}
