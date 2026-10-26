import {TestBed} from '@angular/core/testing';
import {provideRouter, Router, UrlTree} from '@angular/router';
import {AuthService} from '@services/auth.service';
import {TeamService} from '@services/team.service';
import {Team} from '@models/team.model';
import {unknownRouteRedirect} from './unknown-route.redirect';

describe('unknownRouteRedirect', () => {
  let authenticated: boolean;
  let team: Team | null;

  function redirectUrl(): string {
    const result = TestBed.runInInjectionContext(() =>
      unknownRouteRedirect({} as Parameters<typeof unknownRouteRedirect>[0])
    );
    return TestBed.inject(Router).serializeUrl(result as UrlTree);
  }

  beforeEach(() => {
    authenticated = true;
    team = {} as Team;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: AuthService, useValue: {isAuthenticated: () => authenticated}},
        {provide: TeamService, useValue: {getCurrentTeam: () => team}},
      ]
    });
  });

  it('sends a logged-out user to Login', () => {
    authenticated = false;

    expect(redirectUrl()).toBe('/login');
  });

  it('sends a user without a team to Team selection', () => {
    team = null;

    expect(redirectUrl()).toBe('/team-selection');
  });

  it('sends a user with a team to Dashboard Home', () => {
    expect(redirectUrl()).toBe('/dashboard/home');
  });
});
