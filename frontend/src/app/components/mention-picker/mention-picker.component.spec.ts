import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {MentionPickerComponent} from './mention-picker.component';
import {MentionCandidate} from '@models/mention.model';

const results: MentionCandidate[] = [
  {type: 'user', id: 1, title: 'Ann', subtitle: null, avatar: {color: 'red', imageUrl: null}},
  {type: 'ticket', id: 2, title: 'Login bug', subtitle: 'Sprint', boardId: 3, inBacklog: false},
];

describe('MentionPickerComponent', () => {
  let fixture: ComponentFixture<MentionPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentionPickerComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
    fixture = TestBed.createComponent(MentionPickerComponent);
  });

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.mentionPicker__row'));
  }

  it('lists people with avatars and items with icons and subtitles, highlighting the active row', () => {
    fixture.componentInstance.results = results;
    fixture.componentInstance.activeIndex = 1;
    fixture.detectChanges();

    expect(rows().length).toBe(2);
    expect(rows()[0].querySelector('app-avatar')).not.toBeNull();
    expect(rows()[1].querySelector('app-icon')).not.toBeNull();
    expect(rows()[1].textContent).toContain('Sprint');
    expect(rows()[1].classList).toContain('mentionPicker__row--active');
    expect(rows()[1].getAttribute('aria-selected')).toBe('true');
  });

  it('emits the clicked result', () => {
    const picked = jasmine.createSpy('pick');
    fixture.componentInstance.results = results;
    fixture.componentInstance.pick.subscribe(picked);
    fixture.detectChanges();

    rows()[1].click();

    expect(picked).toHaveBeenCalledWith(results[1]);
  });

  it('shows the empty message only when not loading', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('MENTION_NO_MATCHES');

    fixture.componentInstance.loading = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('MENTION_NO_MATCHES');
    expect(fixture.nativeElement.textContent).toContain('MENTION_SEARCHING');
  });
});
