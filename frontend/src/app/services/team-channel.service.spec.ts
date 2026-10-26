import {Subscription} from '@rails/actioncable';
import {TeamChannelService} from "./team-channel.service";
import {CableService} from "@services/cable.service";
import {TeamService} from "@services/team.service";
import {rawTestTeam, testTeam} from "../testing/teamFixtures";

describe('TeamChannelService', () => {
  it('applies the mapped team from a features_changed message', () => {
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['applyFeatures']);
    const service = new TeamChannelService({} as CableService, teamService);

    service.handleMessage({type: 'features_changed', team: rawTestTeam({boards_enabled: false})});

    expect(teamService.applyFeatures).toHaveBeenCalledOnceWith(testTeam({boardsEnabled: false}));
  });

  it('subscribes through the shared cable and disconnect only unsubscribes', () => {
    const subscription = jasmine.createSpyObj<Subscription>('Subscription', ['unsubscribe', 'perform']);
    const cableService = jasmine.createSpyObj<CableService>('CableService', ['subscribe', 'disconnect']);
    cableService.subscribe.and.returnValue(subscription);
    const service = new TeamChannelService(cableService, {} as TeamService);

    service.connect('abc');
    service.disconnect();

    expect(cableService.subscribe).toHaveBeenCalledOnceWith({channel: 'TeamChannel', team_code: 'abc'}, jasmine.any(Object));
    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(cableService.disconnect).not.toHaveBeenCalled();
  });
});
