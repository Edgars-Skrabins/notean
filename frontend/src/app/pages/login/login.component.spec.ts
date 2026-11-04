import {LoginComponent} from "./login.component";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {SessionService} from "@services/session.service";
import {ActivatedRoute, convertToParamMap} from "@angular/router";
import {fakeAsync, TestBed, tick} from "@angular/core/testing";
import {provideTranslateService} from "@ngx-translate/core";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";
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

describe('LoginComponent form', () => {
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    authService.login.and.resolveTo({success: false, code: 'INVALID_CREDENTIALS'} as Awaited<ReturnType<AuthService['login']>>);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideTranslateService(),
        {provide: NavigationService, useValue: jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate', 'navigateByUrl', 'navigateWithQuery'])},
        {provide: AuthService, useValue: authService},
        {provide: SessionService, useValue: jasmine.createSpyObj<SessionService>('SessionService', ['load'])},
        {provide: ActivatedRoute, useValue: {snapshot: {queryParamMap: convertToParamMap({})}}},
      ],
    })
      .overrideComponent(AuthCardComponent, {set: {imports: [], template: '<ng-content select="[card-corner]"></ng-content><ng-content></ng-content>'}})
      .compileComponents();
  });

  it('lets password managers fill the credentials and submits once', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#emailInput')!.getAttribute('autocomplete')).toBe('username');
    expect(element.querySelector('#passwordInput')!.getAttribute('autocomplete')).toBe('current-password');

    element.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(authService.login).toHaveBeenCalledTimes(1);
  });
});
