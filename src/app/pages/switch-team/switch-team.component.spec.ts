import {SwitchTeamComponent} from "./switch-team.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";

describe('SwitchTeamComponent.isActive', () => {
  let component: SwitchTeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;

  beforeEach(() => {
    teamService = jasmine.createSpyObj('TeamService', ['getCurrentTeam']);
    component = new SwitchTeamComponent({} as NavigationService, teamService);
  });

  it('returns false when the team code does not match the current team', () => {
    teamService.getCurrentTeam.and.returnValue({id: 1, name: 'Team A', code: 'aaa'});

    expect(component.isActive({id: 2, name: 'Team B', code: 'bbb', role: 'user'})).toBeFalse();
  });

  it('returns true when the team code matches the current team', () => {
    teamService.getCurrentTeam.and.returnValue({id: 1, name: 'Team A', code: 'aaa'});

    expect(component.isActive({id: 1, name: 'Team A', code: 'aaa', role: 'owner'})).toBeTrue();
  });

  it('returns false when there is no current team', () => {
    teamService.getCurrentTeam.and.returnValue(null);

    expect(component.isActive({id: 1, name: 'Team A', code: 'aaa', role: 'user'})).toBeFalse();
  });
});
