import {ComponentFixture, TestBed, fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {provideTranslateService, TranslateService} from '@ngx-translate/core';
import {MentionContentComponent} from './mention-content.component';
import {MentionService} from '@services/mention.service';
import {TeamService} from '@services/team.service';
import {MentionRef, ResolvedMention} from '@models/mention.model';
import {PHRASES} from '@config/phrases';

describe('MentionContentComponent', () => {
  let fixture: ComponentFixture<MentionContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentionContentComponent],
      providers: [provideTranslateService(), {provide: TeamService, useValue: {getCurrentTeamCode: () => 'T1'}}],
    }).compileComponents();
    spyOn(TestBed.inject(TranslateService), 'instant').and.callFake((key: string | string[]) => `t:${key}`);
    spyOn(TestBed.inject(MentionService), 'resolve').and.callFake((_team: string, ref: MentionRef): Promise<ResolvedMention> =>
      Promise.resolve(ref.type === 'page' ? {...ref, status: 'ok', title: 'Spec v2'} : {...ref, status: 'hidden'}));
    fixture = TestBed.createComponent(MentionContentComponent);
  });

  afterEach(() => fixture.destroy());

  function chips(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.mentionChip') as NodeListOf<HTMLElement>).map((chip) => chip.textContent!.trim());
  }

  it('renders rich text with resolved chips and drops unknown markup', fakeAsync(() => {
    fixture.componentInstance.html = '<p>See <span data-type="mention" data-id="4" data-label="Spec" data-mention-type="page">@Spec</span><iframe src="x"></iframe></p>';
    fixture.detectChanges();
    flushMicrotasks();

    expect(chips()).toEqual(['Spec v2']);
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ProseMirror').getAttribute('contenteditable')).toBe('false');
  }));

  it('renders plain token text and locks hidden items', fakeAsync(() => {
    fixture.componentInstance.text = 'Ask about @[ticket:7|Secret]';
    fixture.detectChanges();
    flushMicrotasks();

    expect(chips()).toEqual([`t:${PHRASES.MENTION_PRIVATE_ITEM}`]);
    expect(fixture.nativeElement.textContent).not.toContain('Secret');
  }));

  it('re-renders when the input changes', fakeAsync(() => {
    fixture.componentInstance.text = 'first';
    fixture.detectChanges();
    fixture.componentInstance.text = 'second';
    fixture.componentInstance.ngOnChanges({text: {currentValue: 'second', previousValue: 'first', firstChange: false, isFirstChange: () => false}});

    expect(fixture.nativeElement.textContent).toContain('second');
  }));
});
