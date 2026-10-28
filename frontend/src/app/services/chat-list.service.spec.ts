import {BehaviorSubject, Subject} from "rxjs";
import {ChatListService, orderChatChannels} from "./chat-list.service";
import {ChatService} from "@services/chat.service";
import {ChatCableService} from "@services/chat-cable.service";
import {TeamService} from "@services/team.service";
import {TeamChannelService} from "@services/team-channel.service";
import {AuthService} from "@services/auth.service";
import {TeamFeatures} from "@models/team.model";
import {ChatChannelSummary, ChatMessage} from "@models/chat.model";
import {projectFilterStub, ProjectFilterStub} from "../testing/projectFilterStub";
import {testChatChannel, testChatMessage} from "../testing/chatFixtures";

describe('orderChatChannels', () => {
  const channels = [
    testChatChannel({id: 1, createdAt: '2026-01-01'}),
    testChatChannel({id: 2, createdAt: '2026-01-03'}),
    testChatChannel({id: 3, createdAt: '2026-01-02'}),
  ];

  it('puts channels missing from the stored order first, newest first', () => {
    expect(orderChatChannels(channels, [1, 99]).map((channel) => channel.id)).toEqual([2, 3, 1]);
  });
});

describe('ChatListService', () => {
  let chatService: jasmine.SpyObj<ChatService>;
  let teamService: jasmine.SpyObj<TeamService>;
  let projectFilter: ProjectFilterStub;
  let messageCreated: Subject<ChatMessage>;
  let channelUpserted: Subject<ChatChannelSummary>;
  let channelRemoved: Subject<number>;
  let service: ChatListService;

  function current(): ChatChannelSummary[] {
    let value: ChatChannelSummary[] = [];
    service.channels$.subscribe((channels) => value = channels).unsubscribe();
    return value;
  }

  function total(): number {
    let value = 0;
    service.totalUnread$.subscribe((count) => value = count).unsubscribe();
    return value;
  }

  beforeEach(async () => {
    localStorage.clear();
    chatService = jasmine.createSpyObj<ChatService>('ChatService', ['listChannels']);
    chatService.listChannels.and.returnValue(Promise.resolve({
      success: true,
      channels: [testChatChannel({id: 1, unreadCount: 2}), testChatChannel({id: 2, name: 'Game', projectId: 7, unreadCount: 1})],
      creatableScopes: ['project'],
      creatableProjectIds: [7],
    }));
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode', 'isFeatureEnabled'], {
      features$: new BehaviorSubject<TeamFeatures>({pages: true, diagrams: true, boards: true, chat: true}),
    });
    teamService.getCurrentTeamCode.and.returnValue('abc');
    teamService.isFeatureEnabled.and.returnValue(true);
    projectFilter = projectFilterStub();
    messageCreated = new Subject<ChatMessage>();
    channelUpserted = new Subject<ChatChannelSummary>();
    channelRemoved = new Subject<number>();
    const cable = {
      messageCreated$: messageCreated,
      channelUpserted$: channelUpserted,
      channelRemoved$: channelRemoved,
      channelsChanged$: new Subject<void>(),
    } as unknown as ChatCableService;
    const teamChannel = {membersChanged$: new Subject<void>()} as unknown as TeamChannelService;
    const auth = {getCurrentUser: () => ({id: 1})} as unknown as AuthService;
    service = new ChatListService(chatService, cable, teamService, teamChannel, projectFilter.service, auth);
    await service.load();
  });

  afterEach(() => localStorage.clear());

  it('loads the channels with their unread total and what the user may create', () => {
    expect(chatService.listChannels).toHaveBeenCalledWith('abc', null);
    expect(current().map((channel) => channel.id)).toEqual([1, 2]);
    expect(total()).toBe(3);
    expect(service.creatableProjectIds).toEqual([7]);
  });

  it('counts messages from others in channels that are not open', () => {
    messageCreated.next(testChatMessage({chatChannelId: 1}));
    messageCreated.next(testChatMessage({chatChannelId: 1, author: {id: 1, nickname: 'me', avatar: {color: 'red', imageUrl: null}}}));

    expect(current()[0].unreadCount).toBe(3);
  });

  it('does not count messages in the open channel while the tab is visible', () => {
    spyOnProperty(document, 'visibilityState').and.returnValue('visible');
    service.setActive(1);
    messageCreated.next(testChatMessage({chatChannelId: 1}));

    expect(current()[0].unreadCount).toBe(2);

    service.markRead(1);
    expect(total()).toBe(1);
  });

  it('keeps unread counts on a rename, reloads for a new channel and drops a removed one', () => {
    channelUpserted.next(testChatChannel({id: 1, name: 'Renamed'}));
    expect(current()[0]).toEqual(jasmine.objectContaining({name: 'Renamed', unreadCount: 2}));

    channelUpserted.next(testChatChannel({id: 5}));
    expect(chatService.listChannels).toHaveBeenCalledTimes(2);

    channelRemoved.next(2);
    expect(current().map((channel) => channel.id)).toEqual([1]);
  });

  it('remembers the dragged order per team', () => {
    service.move(0, 1);

    expect(JSON.parse(localStorage.getItem('chatChannelOrder:abc')!)).toEqual([2, 1]);
  });

  it('empties the list when chat is turned off', async () => {
    teamService.isFeatureEnabled.and.returnValue(false);

    await service.load();

    expect(current()).toEqual([]);
  });
});
