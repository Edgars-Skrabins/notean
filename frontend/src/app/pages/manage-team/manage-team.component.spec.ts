import {ManageTeamComponent} from "./manage-team.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {TranslateService} from "@ngx-translate/core";

describe('ManageTeamComponent.showDeleteTeam', () => {
  let component: ManageTeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;

  beforeEach(() => {
    teamService = jasmine.createSpyObj('TeamService', ['getCurrentTeam', 'getCurrentRole', 'fetchTeamMembers']);
    teamService.getCurrentTeam.and.returnValue({id: 1, name: 'Team A', code: 'aaa'});
    teamService.fetchTeamMembers.and.returnValue(Promise.resolve([]));
    component = new ManageTeamComponent({} as NavigationService, teamService, {} as TranslateService);
  });

  it('returns false when the current role is user', () => {
    teamService.getCurrentRole.and.returnValue('user');

    expect(component.showDeleteTeam).toBeFalse();
  });

  it('returns false when the current role is admin', () => {
    teamService.getCurrentRole.and.returnValue('admin');

    expect(component.showDeleteTeam).toBeFalse();
  });

  it('returns true when the current role is owner', () => {
    teamService.getCurrentRole.and.returnValue('owner');

    expect(component.showDeleteTeam).toBeTrue();
  });
});
