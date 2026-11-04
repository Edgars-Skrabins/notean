import {ElementRef} from "@angular/core";
import {DashboardHeaderComponent} from "./dashboard-header.component";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {SessionService} from "@services/session.service";
import {TeamService} from "@services/team.service";
import {AvatarService} from "@services/avatar.service";
import {AppRoutes} from "../../app/app-routes.enum";

describe('DashboardHeaderComponent account menu navigation', () => {
  let component: DashboardHeaderComponent;
  let navigationService: jasmine.SpyObj<NavigationService>;

  beforeEach(() => {
    navigationService = jasmine.createSpyObj('NavigationService', ['navigate']);
    component = new DashboardHeaderComponent(navigationService, {} as AuthService, {} as TeamService, {} as SessionService, {} as AvatarService, new ElementRef(document.createElement('div')));
  });

  it('opens Settings inside the dashboard', () => {
    component.handleGoToSettings();

    expect(navigationService.navigate).toHaveBeenCalledWith(AppRoutes.DASHBOARD, AppRoutes.SETTINGS);
  });

  it('opens Profile inside the dashboard', () => {
    component.handleGoToProfile();

    expect(navigationService.navigate).toHaveBeenCalledWith(AppRoutes.DASHBOARD, AppRoutes.PROFILE);
  });

  it('opens Manage team inside the dashboard', () => {
    component.handleGoToManageTeam();

    expect(navigationService.navigate).toHaveBeenCalledWith(AppRoutes.DASHBOARD, AppRoutes.MANAGE_TEAM);
  });

  it('still opens Team selection as a standalone screen', () => {
    component.handleGoToTeams();

    expect(navigationService.navigate).toHaveBeenCalledWith(AppRoutes.TEAM_SELECTION);
  });
});

describe('DashboardHeaderComponent.showManageTeam', () => {
  let component: DashboardHeaderComponent;
  let teamService: jasmine.SpyObj<TeamService>;

  beforeEach(() => {
    teamService = jasmine.createSpyObj('TeamService', ['getCurrentRole']);
    component = new DashboardHeaderComponent({} as NavigationService, {} as AuthService, teamService, {} as SessionService, {} as AvatarService, new ElementRef(document.createElement('div')));
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

describe('DashboardHeaderComponent.nickname', () => {
  let component: DashboardHeaderComponent;
  let teamService: jasmine.SpyObj<TeamService>;

  beforeEach(() => {
    teamService = jasmine.createSpyObj('TeamService', ['getCurrentNickname']);
    component = new DashboardHeaderComponent({} as NavigationService, {} as AuthService, teamService, {} as SessionService, {} as AvatarService, new ElementRef(document.createElement('div')));
  });

  it('shows the nickname for the active team', () => {
    teamService.getCurrentNickname.and.returnValue('Alice');

    expect(component.nickname).toBe('Alice');
  });

  it('shows an empty string when there is no nickname', () => {
    teamService.getCurrentNickname.and.returnValue(null);

    expect(component.nickname).toBe('');
  });
});

describe('DashboardHeaderComponent.handleOutsideClick', () => {
  let component: DashboardHeaderComponent;
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    component = new DashboardHeaderComponent({} as NavigationService, {} as AuthService, {} as TeamService, {} as SessionService, {} as AvatarService, new ElementRef(host));
  });

  it('closes the menu on a click outside', () => {
    component.toggleMenu();

    component.handleOutsideClick({target: document.body} as unknown as MouseEvent);

    expect(component.isMenuOpen).toBeFalse();
  });

  it('keeps the menu open on a click inside the trigger', () => {
    const trigger = document.createElement('div');
    trigger.className = 'dashboardHeader__trigger';
    const inside = document.createElement('span');
    trigger.appendChild(inside);
    host.appendChild(trigger);
    component.toggleMenu();

    component.handleOutsideClick({target: inside} as unknown as MouseEvent);

    expect(component.isMenuOpen).toBeTrue();
  });
});
