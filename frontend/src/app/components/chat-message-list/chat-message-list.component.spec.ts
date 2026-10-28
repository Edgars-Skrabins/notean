import {ElementRef} from '@angular/core';
import {ChatMessageListComponent, isGroupedMessage} from './chat-message-list.component';
import {testChatMessage} from '../../testing/chatFixtures';

describe('isGroupedMessage', () => {
  const first = testChatMessage({id: 1, createdAt: '2026-10-01T10:00:00Z'});

  it('groups consecutive messages from one author within five minutes', () => {
    expect(isGroupedMessage(first, testChatMessage({id: 2, createdAt: '2026-10-01T10:04:00Z'}), null)).toBeTrue();
  });

  it('starts a new group after a pause, for another author, at the first message and at the unread divider', () => {
    expect(isGroupedMessage(first, testChatMessage({id: 2, createdAt: '2026-10-01T10:06:00Z'}), null)).toBeFalse();
    expect(isGroupedMessage(first, testChatMessage({id: 2, author: {id: 9, nickname: 'ann', avatar: {color: 'red', imageUrl: null}}}), null)).toBeFalse();
    expect(isGroupedMessage(undefined, first, null)).toBeFalse();
    expect(isGroupedMessage(first, testChatMessage({id: 2, createdAt: '2026-10-01T10:01:00Z'}), 2)).toBeFalse();
  });
});

describe('ChatMessageListComponent pinning', () => {
  let scroller: HTMLDivElement;
  let component: ChatMessageListComponent;

  beforeEach(() => {
    scroller = document.createElement('div');
    scroller.style.cssText = 'height: 300px; overflow-y: auto;';
    scroller.innerHTML = '<div style="height: 2000px"></div>';
    document.body.appendChild(scroller);
    component = new ChatMessageListComponent();
    component.scroller = new ElementRef(scroller);
  });

  afterEach(() => scroller.remove());

  it('stays at the bottom when the list shrinks while it was at the bottom', () => {
    component.scrollToBottom();
    component.handleScroll();

    scroller.style.height = '150px';
    component.handleResize();

    expect(component.isNearBottom()).toBeTrue();
    expect(scroller.scrollTop).toBe(scroller.scrollHeight - scroller.clientHeight);
  });

  it('leaves the position alone when the reader had scrolled up', () => {
    scroller.scrollTop = 400;
    component.handleScroll();

    scroller.style.height = '150px';
    component.handleResize();

    expect(scroller.scrollTop).toBe(400);
  });
});
