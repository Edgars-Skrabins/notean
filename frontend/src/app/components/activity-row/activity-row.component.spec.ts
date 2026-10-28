import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {ActivityRowComponent} from './activity-row.component';
import {Notification} from '@models/notification.model';
import {PHRASES} from '@config/phrases';
import {testNotification} from '../../testing/notificationFixtures';

describe('ActivityRowComponent', () => {
  let fixture: ComponentFixture<ActivityRowComponent>;

  function render(notification: Notification) {
    fixture = TestBed.createComponent(ActivityRowComponent);
    fixture.componentInstance.notification = notification;
    fixture.detectChanges();
  }

  function text(selector: string): string {
    return (fixture.nativeElement.querySelector(selector) as HTMLElement | null)?.textContent!.replace(/\s+/g, ' ').trim() ?? '';
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityRowComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
  });

  it('reads as actor, event and item title, with an unread dot', () => {
    render(testNotification({kind: 'assigned', itemTitle: 'Fix login'}));

    expect(text('.activityRow__sentence')).toBe(`Bob ${PHRASES.ACTIVITY_ASSIGNED} Fix login`);
    expect(fixture.nativeElement.querySelector('.activityRow__dot')).not.toBeNull();
  });

  it('lists the changed fields and how many more changes were collapsed', () => {
    render(testNotification({kind: 'item_changed', changedFields: ['title', 'status'], eventCount: 3, read: true}));

    expect(text('.activityRow__detail')).toBe(`${PHRASES.ACTIVITY_FIELD_TITLE}, ${PHRASES.ACTIVITY_FIELD_STATUS} · ${PHRASES.ACTIVITY_EVENT_COUNT}`);
    expect(fixture.nativeElement.querySelector('.activityRow__dot')).toBeNull();
  });

  it('shows a comment excerpt', () => {
    render(testNotification({kind: 'commented', excerpt: 'Looks good'}));

    expect(text('.activityRow__detail')).toBe('Looks good');
  });

  it('emits open from the row and toggleRead from the button', () => {
    const notification = testNotification();
    render(notification);
    const opened: Notification[] = [];
    const toggled: Notification[] = [];
    fixture.componentInstance.open.subscribe((value) => opened.push(value));
    fixture.componentInstance.toggleRead.subscribe((value) => toggled.push(value));

    (fixture.nativeElement.querySelector('.activityRow__main') as HTMLElement).click();
    (fixture.nativeElement.querySelector('app-icon-button button') as HTMLElement).click();

    expect(opened).toEqual([notification]);
    expect(toggled).toEqual([notification]);
  });
});
