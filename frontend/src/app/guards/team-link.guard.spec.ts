import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, convertToParamMap, provideRouter, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {AuthService} from '@services/auth.service';
import {TeamService} from '@services/team.service';
import {NavigationService} from '@services/navigation.service';
import {ActivateTeamResponse, Team} from '@models/team.model';
import {teamLinkGuard} from './team-link.guard';

describe('teamLinkGuard', () => {
  let authenticated: boolean;
  let currentTeam: Team | null;
  let activateTeam: jasmine.Spy<(code: string) => Promise<ActivateTeamResponse>>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let routerUrl: string;

  function runGuard(url: string) {
    const queryParams = TestBed.inject(Router).parseUrl(url).queryParams;
    const route = {queryParamMap: convertToParamMap(queryParams)} as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => teamLinkGuard(route, {url} as RouterStateSnapshot)) as Promise<boolean | UrlTree>;
  }

  async function resultUrl(url: string): Promise<string | boolean> {
    const result = await runGuard(url);
    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
  }

  beforeEach(() => {
    authenticated = true;
    currentTeam = {code: 'MINE'} as Team;
    routerUrl = '/';
    activateTeam = jasmine.createSpy('activateTeam').and.callFake(async (code: string) => {
      currentTeam = {code} as Team;
      return {success: true, team: currentTeam, role: 'user', nickname: 'nick'} as ActivateTeamResponse;
    });
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['reloadAt']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: AuthService, useValue: {isAuthenticated: () => authenticated}},
        {provide: TeamService, useValue: {getCurrentTeam: () => currentTeam, activateTeam}},
        {provide: NavigationService, useValue: navigationService},
      ]
    });
    spyOnProperty(TestBed.inject(Router), 'url').and.callFake(() => routerUrl);
  });

  it('lets a link without a team through', async () => {
    expect(await resultUrl('/dashboard/pages/4')).toBeTrue();
    expect(activateTeam).not.toHaveBeenCalled();
  });

  it('leaves a logged-out link to authGuard without activating the team', async () => {
    authenticated = false;

    expect(await resultUrl('/dashboard/pages/4?team=OTHER')).toBeTrue();
    expect(activateTeam).not.toHaveBeenCalled();
  });

  it('drops the param when the link is for the active team', async () => {
    expect(await resultUrl('/dashboard/pages/4?team=MINE')).toBe('/dashboard/pages/4');
    expect(activateTeam).not.toHaveBeenCalled();
  });

  it('switches to the link team and drops only the team param', async () => {
    expect(await resultUrl('/dashboard/boards/2/list?team=OTHER&x=1')).toBe('/dashboard/boards/2/list?x=1');
    expect(activateTeam).toHaveBeenCalledOnceWith('OTHER');
    expect(navigationService.reloadAt).not.toHaveBeenCalled();
  });

  it('sends a non-member to the unavailable screen', async () => {
    activateTeam.and.resolveTo({success: false, code: 'NOT_TEAM_MEMBER'});

    expect(await resultUrl('/dashboard/pages/4?team=OTHER')).toBe('/unavailable');
    expect(navigationService.reloadAt).not.toHaveBeenCalled();
  });

  it('reloads the page when switching team from inside the dashboard', async () => {
    routerUrl = '/dashboard/home';

    expect(await resultUrl('/dashboard/pages/4?team=OTHER')).toBeFalse();
    expect(navigationService.reloadAt).toHaveBeenCalledOnceWith('/dashboard/pages/4');
  });
});
