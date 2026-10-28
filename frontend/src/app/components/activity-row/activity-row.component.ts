import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {defaultLanguage} from '@config/translationConfig';
import {Notification, NotificationChangedField, NotificationItemType, NotificationKind} from '@models/notification.model';
import {AvatarComponent} from '@components/avatar/avatar.component';
import {IconComponent, IconName} from '@components/icon/icon.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {relativeDate} from '@utils/relativeDate';

const KIND_PHRASES: Record<NotificationKind, string> = {
  assigned: PHRASES.ACTIVITY_ASSIGNED,
  unassigned: PHRASES.ACTIVITY_UNASSIGNED,
  item_changed: PHRASES.ACTIVITY_CHANGED,
  item_deleted: PHRASES.ACTIVITY_TRASHED,
  commented: PHRASES.ACTIVITY_COMMENTED,
  mentioned: PHRASES.ACTIVITY_MENTIONED,
};

const FIELD_PHRASES: Record<NotificationChangedField, string> = {
  title: PHRASES.ACTIVITY_FIELD_TITLE,
  description: PHRASES.ACTIVITY_FIELD_DESCRIPTION,
  content: PHRASES.ACTIVITY_FIELD_CONTENT,
  status: PHRASES.ACTIVITY_FIELD_STATUS,
  priority: PHRASES.ACTIVITY_FIELD_PRIORITY,
};

const ITEM_ICONS: Record<NotificationItemType, IconName> = {
  Ticket: 'ticket',
  Page: 'page',
  Diagram: 'diagram',
  Project: 'project',
};

@Component({
  selector: 'app-activity-row',
  imports: [
    NgIf,
    TranslatePipe,
    AvatarComponent,
    IconComponent,
    IconButtonComponent
  ],
  templateUrl: './activity-row.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './activity-row.component.css'
})
export class ActivityRowComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) notification!: Notification;
  @Output() open = new EventEmitter<Notification>();
  @Output() toggleRead = new EventEmitter<Notification>();

  constructor(private translateService: TranslateService) {
  }

  get kindPhrase(): string {
    return KIND_PHRASES[this.notification.kind];
  }

  get itemIcon(): IconName {
    return ITEM_ICONS[this.notification.itemType];
  }

  get changedFields(): string {
    return this.notification.changedFields.map((field) => this.translateService.instant(FIELD_PHRASES[field])).join(', ');
  }

  get relativeTime(): string {
    return relativeDate(this.notification.occurredAt, this.translateService.getCurrentLang() ?? this.translateService.getFallbackLang() ?? defaultLanguage);
  }
}
