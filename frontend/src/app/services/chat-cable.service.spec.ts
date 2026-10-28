import {ChatCableService} from "./chat-cable.service";
import {CableService} from "@services/cable.service";
import {ChatMessage, ChatReaction} from "@models/chat.model";

describe('ChatCableService', () => {
  const rawUser = {id: 2, nickname: 'bob', avatar: {color: 'red' as const, image_url: null}};
  let cableService: jasmine.SpyObj<CableService>;
  let perform: jasmine.Spy;
  let service: ChatCableService;

  beforeEach(() => {
    perform = jasmine.createSpy('perform');
    cableService = jasmine.createSpyObj<CableService>('CableService', ['subscribe']);
    cableService.subscribe.and.returnValue({perform, unsubscribe: () => undefined});
    service = new ChatCableService(cableService);
  });

  it('subscribes once per team', () => {
    service.connect('abc');
    service.connect('abc');

    expect(cableService.subscribe).toHaveBeenCalledOnceWith({channel: 'ChatCable', team_code: 'abc'}, jasmine.any(Object));
  });

  it('maps message and reaction events', () => {
    const created: ChatMessage[] = [];
    const reactions: ChatReaction[][] = [];
    service.messageCreated$.subscribe((message) => created.push(message));
    service.reactionsChanged$.subscribe((change) => reactions.push(change.reactions));

    service.handleMessage({
      type: 'message_created',
      chat_channel_id: 1,
      message: {id: 5, chat_channel_id: 1, kind: 'text', body: 'Hi', gif: null, author: rawUser, created_at: 'now', edited_at: null, reactions: []},
    });
    service.handleMessage({type: 'reactions_changed', chat_channel_id: 1, message_id: 5, reactions: [{emoji: '👍', user_ids: [2]}]});

    expect(created[0]).toEqual(jasmine.objectContaining({id: 5, chatChannelId: 1, author: {id: 2, nickname: 'bob', avatar: {color: 'red', imageUrl: null}}}));
    expect(reactions).toEqual([[{emoji: '👍', userIds: [2]}]]);
  });

  it('sends typing at most every three seconds per channel', () => {
    service.connect('abc');

    service.sendTyping(1, 10_000);
    service.sendTyping(1, 11_000);
    service.sendTyping(2, 11_000);
    service.sendTyping(1, 13_500);

    expect(perform.calls.allArgs()).toEqual([
      ['typing', {chat_channel_id: 1}],
      ['typing', {chat_channel_id: 2}],
      ['typing', {chat_channel_id: 1}],
    ]);
  });
});
