import {TestBed} from '@angular/core/testing';
import {provideRouter} from "@angular/router";
import {BehaviorSubject} from "rxjs";
import {provideTranslateService} from "@ngx-translate/core";
import {SidebarChatComponent} from "./sidebar-chat.component";
import {ChatListService} from "@services/chat-list.service";
import {ChatChannelScope, ChatChannelSummary} from "@models/chat.model";
import {testChatChannel} from "../../testing/chatFixtures";

describe('SidebarChatComponent', () => {
  function render(channels: ChatChannelSummary[], scopes: ChatChannelScope[]) {
    const chatListService = {
      channels$: new BehaviorSubject(channels),
      creatableScopes$: new BehaviorSubject(scopes),
      totalUnread$: new BehaviorSubject(channels.reduce((total, channel) => total + channel.unreadCount, 0)),
      isOpen: true,
      load: jasmine.createSpy('load'),
    };
    TestBed.configureTestingModule({
      imports: [SidebarChatComponent],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        {provide: ChatListService, useValue: chatListService},
      ],
    });
    const fixture = TestBed.createComponent(SidebarChatComponent);
    fixture.detectChanges();
    return {fixture, chatListService};
  }

  it('lists the channels with their unread counts and loads them on init', () => {
    const {fixture, chatListService} = render([testChatChannel({id: 1, unreadCount: 3}), testChatChannel({id: 2, name: 'Quiet'})], ['team']);
    const rows = Array.from(fixture.nativeElement.querySelectorAll('a.sidebarList__row')) as HTMLElement[];

    expect(chatListService.load).toHaveBeenCalled();
    expect(rows.map((row) => row.getAttribute('href'))).toEqual(['/dashboard/chat/1', '/dashboard/chat/2']);
    expect(rows[0].querySelector('app-unread-badge')?.textContent?.trim()).toBe('3');
    expect(rows[1].querySelector('app-unread-badge')).toBeNull();
  });

  it('offers to create a channel only to people who may create one', () => {
    expect(render([], []).fixture.nativeElement.querySelector('.sidebarList__create')).toBeNull();

    TestBed.resetTestingModule();
    const {fixture} = render([], ['project']);
    expect(fixture.nativeElement.querySelector('.sidebarList__create')).not.toBeNull();
  });
});
