import {LoginComponent} from "./login.component";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {SessionService} from "@services/session.service";
import {ActivatedRoute, convertToParamMap} from "@angular/router";
import {fakeAsync, tick} from "@angular/core/testing";
import {AppRoutes} from "../../app/app-routes.enum";

describe('LoginComponent', () => {
  let navigationService: jasmine.SpyObj<NavigationService>;
  let authService: jasmine.SpyObj<AuthService>;
  let sessionService: jasmine.SpyObj<SessionService>;

  function create(queryParams: Record<string, string>): LoginComponent {
    const route = {snapshot: {queryParamMap: convertToParamMap(queryParams)}} as unknown as ActivatedRoute;
    return new LoginComponent(navigationService, authService, sessionService, route);
  }

  beforeEach(() => {
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate', 'navigateByUrl', 'navigateWithQuery']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    authService.login.and.resolveTo({success: true} as Awaited<ReturnType<AuthService['login']>>);
    sessionService = jasmine.createSpyObj<SessionService>('SessionService', ['load']);
    sessionService.load.and.resolveTo({success: true, session: {team: {}}} as Awaited<ReturnType<SessionService['load']>>);
  });

  it('continues to the return link after logging in', fakeAsync(() => {
    create({returnUrl: '/dashboard/pages/4?team=AB12CD'}).handleLogin();
    tick();

    expect(navigationService.navigateByUrl).toHaveBeenCalledOnceWith('/dashboard/pages/4?team=AB12CD');
    expect(navigationService.navigate).not.toHaveBeenCalled();
  }));

  it('ignores a return link that leaves the app', fakeAsync(() => {
    create({returnUrl: '//evil.com'}).handleLogin();
    tick();

    expect(navigationService.navigateByUrl).not.toHaveBeenCalled();
    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.DASHBOARD);
  }));

  it('goes to the dashboard without a return link', fakeAsync(() => {
    create({}).handleLogin();
    tick();

    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.DASHBOARD);
  }));

  it('keeps the return link when switching to Register', () => {
    create({returnUrl: '/dashboard/pages/4?team=AB12CD'}).handleGoToRegister();

    expect(navigationService.navigateWithQuery).toHaveBeenCalledOnceWith({returnUrl: '/dashboard/pages/4?team=AB12CD'}, AppRoutes.REGISTER);
  });
});
