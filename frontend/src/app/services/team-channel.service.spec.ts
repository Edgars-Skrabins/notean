import {TranslateService} from "@ngx-translate/core";
import {TeamChannelService} from "./team-channel.service";
import {AuthService} from "@services/auth.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {NavigationService} from "@services/navigation.service";
import {ToastType} from "@models/toast.model";
import {PHRASES} from "@config/phrases";
import {AppRoutes} from "../app/app-routes.enum";
import {rawTestTeam, testTeam} from "../testing/teamFixtures";

describe('TeamChannelService', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let teamService: jasmine.SpyObj<TeamService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let translateService: jasmine.SpyObj<TranslateService>;
  let service: TeamChannelService;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue({id: 7, email: 'alice@example.com'});
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['applyFeatures', 'getCurrentTeam', 'clearCurrentTeam']);
    teamService.getCurrentTeam.and.returnValue(testTeam({code: 'aaa'}));
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate']);
    translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string | string[], params?: object) => `${key} ${JSON.stringify(params)}`);
    service = new TeamChannelService(authService, teamService, toastService, navigationService, translateService);
  });

  it('applies the mapped team from a features_changed message', () => {
    service.handleMessage({type: 'features_changed', team: rawTestTeam({boards_enabled: false})});

    expect(teamService.applyFeatures).toHaveBeenCalledOnceWith(testTeam({boardsEnabled: false}));
  });

  it('clears the team, toasts and goes to team selection when the current user is removed from the active team', () => {
    service.handleMessage({type: 'member_removed', user_id: 7, team: rawTestTeam({code: 'aaa', name: 'Team A'})});

    expect(teamService.clearCurrentTeam).toHaveBeenCalled();
    expect(translateService.instant).toHaveBeenCalledWith(PHRASES.REMOVED_FROM_TEAM, {team: 'Team A'});
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.INFO, message: `${PHRASES.REMOVED_FROM_TEAM} {"team":"Team A"}`});
    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.TEAM_SELECTION);
  });

  it('emits membersChanged$ and leaves the session alone when another user is removed', () => {
    let emitted = 0;
    service.membersChanged$.subscribe(() => emitted++);

    service.handleMessage({type: 'member_removed', user_id: 8, team: rawTestTeam({code: 'aaa'})});

    expect(emitted).toBe(1);
    expect(teamService.clearCurrentTeam).not.toHaveBeenCalled();
    expect(toastService.show).not.toHaveBeenCalled();
    expect(navigationService.navigate).not.toHaveBeenCalled();
  });

  it('leaves the session alone when the removal is from a team that is not active', () => {
    service.handleMessage({type: 'member_removed', user_id: 7, team: rawTestTeam({code: 'bbb'})});

    expect(teamService.clearCurrentTeam).not.toHaveBeenCalled();
    expect(navigationService.navigate).not.toHaveBeenCalled();
  });

  it('emits membersChanged$ on a members_changed message', () => {
    let emitted = 0;
    service.membersChanged$.subscribe(() => emitted++);

    service.handleMessage({type: 'members_changed'});

    expect(emitted).toBe(1);
  });
});
