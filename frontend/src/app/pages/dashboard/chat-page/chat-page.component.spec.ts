import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {ChatPageComponent, typingPhrase} from './chat-page.component';
import {PHRASES} from '@config/phrases';
import {ChatService} from '@services/chat.service';
import {ChatCableService} from '@services/chat-cable.service';
import {ChatListService} from '@services/chat-list.service';
import {TeamService} from '@services/team.service';
import {AuthService} from '@services/auth.service';
import {ToastService} from '@services/toast.service';
import {testChatChannel} from '../../../testing/chatFixtures';
import {trashServiceStub} from '../../../testing/trashServiceStub';
import {AppRoutes} from '../../../app/app-routes.enum';

describe('typingPhrase', () => {
  it('names one or two people and summarises more', () => {
    expect(typingPhrase([])).toBeNull();
    expect(typingPhrase(['Anna'])).toEqual({key: PHRASES.TYPING_ONE, params: {name: 'Anna'}});
    expect(typingPhrase(['Anna', 'Jānis'])).toEqual({key: PHRASES.TYPING_TWO, params: {first: 'Anna', second: 'Jānis'}});
    expect(typingPhrase(['Anna', 'Jānis', 'Bob'])).toEqual({key: PHRASES.TYPING_MANY, params: {}});
  });
});

describe('ChatPageComponent', () => {
  it('leaves for Home and offers to undo when the channel is deleted from its settings', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const chatListService = jasmine.createSpyObj<ChatListService>('ChatListService', ['remove']);
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue(null);
    const trash = trashServiceStub();
    const component = new ChatPageComponent(
      {} as ActivatedRoute,
      router,
      {} as ChatService,
      {} as ChatCableService,
      chatListService,
      teamService,
      authService,
      {} as ToastService,
      {} as TranslateService,
      trash.service,
    );
    component.channel = {...testChatChannel({id: 4, name: 'design-review'}), project: null, members: []};
    component.isSettingsOpen = true;

    component.handleSettingsDeleted([8]);

    expect(component.isSettingsOpen).toBeFalse();
    expect(chatListService.remove).toHaveBeenCalledWith(4);
    expect(router.navigate).toHaveBeenCalledWith(['/', AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME]);
    expect(trash.service.notifyTrashed).toHaveBeenCalledWith('abc', [8], {title: 'design-review'});
  });
});
