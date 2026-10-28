import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {AuthService} from '@services/auth.service';
import {authGuard} from './auth.guard';

describe('authGuard', () => {
  let authenticated: boolean;
  let router: jasmine.SpyObj<Router>;

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {url} as RouterStateSnapshot)
    );
  }

  beforeEach(() => {
    authenticated = true;
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        {provide: AuthService, useValue: {isAuthenticated: () => authenticated}},
        {provide: Router, useValue: router},
      ]
    });
  });

  it('allows a logged-in user', () => {
    expect(runGuard('/dashboard/pages/4')).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('sends a logged-out user to Login with the link to return to', () => {
    authenticated = false;

    expect(runGuard('/dashboard/pages/4?team=AB12CD')).toBeFalse();
    expect(router.navigate).toHaveBeenCalledOnceWith(['login'], {queryParams: {returnUrl: '/dashboard/pages/4?team=AB12CD'}});
  });
});
