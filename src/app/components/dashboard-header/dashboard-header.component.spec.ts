import {DashboardHeaderComponent} from "./dashboard-header.component";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {TeamService} from "@services/team.service";

describe('DashboardHeaderComponent.showManageTeam', () => {
  let component: DashboardHeaderComponent;
  let teamService: jasmine.SpyObj<TeamService>;

  beforeEach(() => {
    teamService = jasmine.createSpyObj('TeamService', ['getCurrentRole']);
    component = new DashboardHeaderComponent({} as NavigationService, {} as AuthService, teamService);
  });

  it('returns false when the current role is user', () => {
    teamService.getCurrentRole.and.returnValue('user');

    expect(component.showManageTeam).toBeFalse();
  });

  it('returns false when there is no current role', () => {
    teamService.getCurrentRole.and.returnValue(null);

    expect(component.showManageTeam).toBeFalse();
  });

  it('returns true when the current role is admin', () => {
    teamService.getCurrentRole.and.returnValue('admin');

    expect(component.showManageTeam).toBeTrue();
  });

  it('returns true when the current role is owner', () => {
    teamService.getCurrentRole.and.returnValue('owner');

    expect(component.showManageTeam).toBeTrue();
  });
});
