import {ChatService} from '@services/chat.service';
import {TeamService} from '@services/team.service';
import {ChatChannel} from '@models/chat.model';
import {errorPhrase} from '@utils/errorPhrase';
import {testChatChannel} from '../../testing/chatFixtures';
import {ChatChannelSettingsDialogComponent} from './chat-channel-settings-dialog.component';

describe('ChatChannelSettingsDialogComponent', () => {
  let component: ChatChannelSettingsDialogComponent;
  let chatService: jasmine.SpyObj<ChatService>;
  let deleted: number[][];

  beforeEach(() => {
    chatService = jasmine.createSpyObj<ChatService>('ChatService', ['updateChannel', 'deleteChannel']);
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode', 'fetchTeamMembers']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    component = new ChatChannelSettingsDialogComponent(chatService, teamService);
    component.channel = {...testChatChannel({id: 4, name: 'design-review'}), project: null, members: []} as ChatChannel;
    deleted = [];
    component.deleted.subscribe((ids) => deleted.push(ids));
  });

  it('deletes the channel at once with one request and emits its trash entries', async () => {
    chatService.deleteChannel.and.returnValue(Promise.resolve({success: true, trashEntryIds: [8]}));

    const first = component.handleDelete();
    const second = component.handleDelete();
    await Promise.all([first, second]);

    expect(chatService.deleteChannel).toHaveBeenCalledOnceWith('abc', 4);
    expect(deleted).toEqual([[8]]);
  });

  it('shows the error and stays open when the delete fails', async () => {
    chatService.deleteChannel.and.returnValue(Promise.resolve({success: false, code: 'NETWORK_ERROR'}));

    await component.handleDelete();

    expect(component.errorMessage).toBe(errorPhrase('NETWORK_ERROR'));
    expect(component.isDeleting).toBeFalse();
    expect(deleted).toEqual([]);
  });
});
