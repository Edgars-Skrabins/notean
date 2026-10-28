import {TranslateService} from '@ngx-translate/core';
import {ChatComposerComponent, gifQuery} from './chat-composer.component';
import {ChatService} from '@services/chat.service';
import {ChatCableService} from '@services/chat-cable.service';
import {TeamService} from '@services/team.service';
import {ToastService} from '@services/toast.service';
import {testChatMessage} from '../../testing/chatFixtures';

describe('gifQuery', () => {
  it('reads the search words of a /gif command only when it is the whole message', () => {
    expect(gifQuery('/gif')).toBe('');
    expect(gifQuery('/gif happy cats')).toBe('happy cats');
    expect(gifQuery('/giffy')).toBeNull();
    expect(gifQuery('hello /gif cats')).toBeNull();
  });
});

describe('ChatComposerComponent', () => {
  let chatService: jasmine.SpyObj<ChatService>;
  let chatCableService: jasmine.SpyObj<ChatCableService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let component: ChatComposerComponent;

  beforeEach(() => {
    chatService = jasmine.createSpyObj<ChatService>('ChatService', ['sendMessage', 'sendGif']);
    chatCableService = jasmine.createSpyObj<ChatCableService>('ChatCableService', ['sendTyping']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    component = new ChatComposerComponent(chatService, chatCableService, teamService, toastService, {} as TranslateService);
    component.channelId = 4;
  });

  it('sends the trimmed text, clears it and announces typing while writing', async () => {
    const sent: number[] = [];
    component.sent.subscribe((message) => sent.push(message.id));
    chatService.sendMessage.and.resolveTo({success: true, message: testChatMessage({id: 9})});

    component.handleChange('  Hi  ');
    await component.handleSubmit();

    expect(chatCableService.sendTyping).toHaveBeenCalledWith(4);
    expect(chatService.sendMessage).toHaveBeenCalledOnceWith('abc', 4, 'Hi');
    expect(component.text).toBe('');
    expect(sent).toEqual([9]);
  });

  it('keeps the text when sending fails', async () => {
    chatService.sendMessage.and.resolveTo({success: false, code: 'MESSAGE_TOO_LONG'});
    component.handleChange('Hello');

    await component.handleSubmit();

    expect(component.text).toBe('Hello');
    expect(toastService.show).toHaveBeenCalled();
  });

  it('does not send a /gif command as text and sends the picked gif instead', async () => {
    chatService.sendGif.and.resolveTo({success: true, message: testChatMessage({kind: 'gif'})});
    component.handleChange('/gif cats');

    await component.handleSubmit();
    await component.handleGifPicked({id: 'abc', url: 'https://media.giphy.com/a.gif', width: 1, height: 1, title: 'Cat'});

    expect(chatService.sendMessage).not.toHaveBeenCalled();
    expect(chatCableService.sendTyping).not.toHaveBeenCalled();
    expect(chatService.sendGif).toHaveBeenCalledOnceWith('abc', 4, 'abc');
    expect(component.text).toBe('');
  });
});
