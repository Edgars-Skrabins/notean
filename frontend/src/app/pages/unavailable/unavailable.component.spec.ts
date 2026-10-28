import {UnavailableComponent} from "./unavailable.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {Team} from "@models/team.model";
import {AppRoutes} from "../../app/app-routes.enum";

describe('UnavailableComponent.handleGoHome', () => {
  let team: Team | null;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let component: UnavailableComponent;

  beforeEach(() => {
    team = {} as Team;
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate']);
    component = new UnavailableComponent(navigationService, {getCurrentTeam: () => team} as TeamService);
  });

  it('goes to the dashboard with an active team', () => {
    component.handleGoHome();

    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.DASHBOARD);
  });

  it('goes to team selection without an active team', () => {
    team = null;

    component.handleGoHome();

    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.TEAM_SELECTION);
  });
});
