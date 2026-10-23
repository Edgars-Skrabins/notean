import {TeamChannelService} from "./team-channel.service";
import {AuthService} from "@services/auth.service";
import {TeamService} from "@services/team.service";
import {rawTestTeam, testTeam} from "../testing/teamFixtures";

describe('TeamChannelService', () => {
  it('applies the mapped team from a features_changed message', () => {
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['applyFeatures']);
    const service = new TeamChannelService({} as AuthService, teamService);

    service.handleMessage({type: 'features_changed', team: rawTestTeam({boards_enabled: false})});

    expect(teamService.applyFeatures).toHaveBeenCalledOnceWith(testTeam({boardsEnabled: false}));
  });
});
