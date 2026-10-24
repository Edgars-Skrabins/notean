import {SwitchTeamComponent} from "./switch-team.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {testTeam} from "../../testing/teamFixtures";
import {escapeServiceStub} from "../../testing/escapeServiceStub";

describe('SwitchTeamComponent.isActive', () => {
  let component: SwitchTeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;

  beforeEach(() => {
    teamService = jasmine.createSpyObj('TeamService', ['getCurrentTeam']);
    component = new SwitchTeamComponent({} as NavigationService, teamService, escapeServiceStub().service);
  });

  it('returns false when the team code does not match the current team', () => {
    teamService.getCurrentTeam.and.returnValue(testTeam({id: 1, name: 'Team A', code: 'aaa'}));

    expect(component.isActive({...testTeam(testTeam({id: 2, name: 'Team B', code: 'bbb'})), role: 'user', nickname: 'Alice'})).toBeFalse();
  });

  it('returns true when the team code matches the current team', () => {
    teamService.getCurrentTeam.and.returnValue(testTeam({id: 1, name: 'Team A', code: 'aaa'}));

    expect(component.isActive({...testTeam(testTeam({id: 1, name: 'Team A', code: 'aaa'})), role: 'owner', nickname: 'Alice'})).toBeTrue();
  });

  it('returns false when there is no current team', () => {
    teamService.getCurrentTeam.and.returnValue(null);

    expect(component.isActive({...testTeam(testTeam({id: 1, name: 'Team A', code: 'aaa'})), role: 'user', nickname: 'Alice'})).toBeFalse();
  });
});
