import {axiosInstance} from "@config/axiosConfig";
import {ChatService} from "./chat.service";

describe('ChatService', () => {
  const service = new ChatService();
  const rawUser = {id: 2, nickname: 'bob', avatar: {color: 'red', image_url: null}};
  const rawMessage = {id: 5, chat_channel_id: 1, kind: 'text', body: 'Hi', gif: null, author: rawUser, created_at: 'now', edited_at: null, reactions: [{emoji: '👍', user_ids: [2]}]};

  it('lists channels for the selected project with what the user may create', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {
      chat_channels: [{id: 1, name: 'General', scope: 'team', project_id: null, gif_rating: 'pg', created_by_user_id: 1, last_message_at: null, created_at: 'then', unread_count: 3, can_manage: true}],
      creatable_scopes: ['team', 'project', 'users'],
      creatable_project_ids: [7],
    }}));

    const response = await service.listChannels('abc', 7);

    expect(get).toHaveBeenCalledWith('/teams/abc/chat_channels', {params: {project_id: 7}});
    expect(response.success && response.channels[0]).toEqual(jasmine.objectContaining({id: 1, unreadCount: 3, canManage: true, gifRating: 'pg'}));
    expect(response.success && response.creatableProjectIds).toEqual([7]);
  });

  it('loads older messages before a cursor and maps both pagination shapes', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValues(
      Promise.resolve({data: {messages: [rawMessage], has_more: true, last_read_message_id: 4}}),
      Promise.resolve({data: {messages: [], has_more_before: false, has_more_after: true, last_read_message_id: 4}}),
    );

    const before = await service.listMessages('abc', 1, {before: 9});
    const around = await service.listMessages('abc', 1, {around: 5});

    expect(get.calls.argsFor(0)).toEqual(['/teams/abc/chat_channels/1/messages', {params: {before: 9}}]);
    expect(get.calls.argsFor(1)).toEqual(['/teams/abc/chat_channels/1/messages', {params: {around: 5}}]);
    expect(before.success && [before.hasMoreBefore, before.messages[0].reactions]).toEqual([true, [{emoji: '👍', userIds: [2]}]]);
    expect(around.success && [around.hasMoreBefore, around.hasMoreAfter]).toEqual([false, true]);
  });

  it('removes a reaction with the emoji in the request body', async () => {
    const remove = spyOn(axiosInstance, 'delete').and.returnValue(Promise.resolve({data: {reactions: []}}));

    await service.removeReaction('abc', 1, 5, '👍');

    expect(remove).toHaveBeenCalledWith('/teams/abc/chat_channels/1/messages/5/reactions', {data: {reaction: {emoji: '👍'}}});
  });
});
