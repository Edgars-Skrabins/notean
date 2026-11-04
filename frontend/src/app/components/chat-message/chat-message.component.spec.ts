import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {ChatMessageComponent} from './chat-message.component';
import {ChatService} from '@services/chat.service';
import {TeamService} from '@services/team.service';
import {ToastService} from '@services/toast.service';
import {RecentReactionsService} from '@services/recent-reactions.service';
import {testChatMessage} from '../../testing/chatFixtures';

describe('ChatMessageComponent', () => {
  let fixture: ComponentFixture<ChatMessageComponent>;
  let host: HTMLElement;

  function root(): HTMLElement {
    return host.querySelector('.chatMessage') as HTMLElement;
  }

  function actions(): HTMLElement {
    return host.querySelector('.chatMessage__actions') as HTMLElement;
  }

  function isRevealed(): boolean {
    return root().classList.contains('chatMessage--revealed') && !actions().hasAttribute('inert');
  }

  function dispatch(event: Event) {
    host.dispatchEvent(event);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMessageComponent],
      providers: [
        provideTranslateService(),
        {provide: ChatService, useValue: {}},
        {provide: TeamService, useValue: {getCurrentTeamCode: () => 'team'}},
        {provide: ToastService, useValue: {show: () => undefined}},
        {provide: RecentReactionsService, useValue: {recent: ['👍', '🎉'], use: () => undefined}},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatMessageComponent);
    fixture.componentInstance.message = testChatMessage();
    fixture.detectChanges();
    host = fixture.nativeElement;
  });

  it('hides the toolbar and makes it inert by default', () => {
    expect(root().classList).not.toContain('chatMessage--revealed');
    expect(actions().hasAttribute('inert')).toBeTrue();
  });

  it('reveals the toolbar on hover and hides it again on leave', () => {
    dispatch(new MouseEvent('mouseenter'));
    expect(isRevealed()).toBeTrue();

    dispatch(new MouseEvent('mouseleave'));
    expect(isRevealed()).toBeFalse();
  });

  it('reveals the toolbar while focus is inside the message', () => {
    dispatch(new FocusEvent('focusin'));

    expect(isRevealed()).toBeTrue();
  });

  it('stays revealed when focus moves within the message and hides when it leaves', () => {
    dispatch(new FocusEvent('focusin'));

    dispatch(new FocusEvent('focusout', {relatedTarget: actions().querySelector('button')}));
    expect(isRevealed()).toBeTrue();

    dispatch(new FocusEvent('focusout', {relatedTarget: document.body}));
    expect(isRevealed()).toBeFalse();
  });

  it('stays revealed while the emoji picker is open', () => {
    fixture.componentInstance.isEmojiOpen = true;
    fixture.detectChanges();

    expect(isRevealed()).toBeTrue();
  });

  it('is one labelled tab stop', () => {
    expect(root().getAttribute('tabindex')).toBe('0');
    expect(root().getAttribute('role')).toBe('article');
    expect(root().getAttribute('aria-label')).toContain('bob');
  });
});
