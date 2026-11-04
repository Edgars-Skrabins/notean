import {RegisterComponent} from "./register.component";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {SessionService} from "@services/session.service";
import {PHRASES} from "@config/phrases";
import {fakeAsync, TestBed, tick} from "@angular/core/testing";
import {ActivatedRoute, convertToParamMap} from "@angular/router";
import {provideTranslateService} from "@ngx-translate/core";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";

describe('RegisterComponent.handleRegister', () => {
  let component: RegisterComponent;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['register']);
    component = new RegisterComponent(
      jasmine.createSpyObj('NavigationService', ['navigate']) as NavigationService,
      authService,
      jasmine.createSpyObj('SessionService', ['load']) as SessionService,
      {} as ActivatedRoute
    );
    component.email = 'alice@example.com';
  });

  it('shows the too short error and sends nothing when the password is under 8 characters', () => {
    component.password = 'a'.repeat(7);

    component.handleRegister();

    expect(component.alertMessage).toBe(PHRASES.PASSWORD_TOO_SHORT);
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('registers when the password has 8 characters', fakeAsync(() => {
    authService.register.and.resolveTo({success: false, code: 'PASSWORD_TOO_SHORT'});
    component.password = 'a'.repeat(8);

    component.handleRegister();
    tick();

    expect(authService.register).toHaveBeenCalledWith({email: 'alice@example.com', password: 'a'.repeat(8)});
    expect(component.alertMessage).toBe('ERRORS.AUTH.PASSWORD_TOO_SHORT');
  }));
});

describe('RegisterComponent form', () => {
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['register']);
    authService.register.and.resolveTo({success: false, code: 'EMAIL_TAKEN'} as Awaited<ReturnType<AuthService['register']>>);
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideTranslateService(),
        {provide: NavigationService, useValue: jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate', 'navigateWithQuery'])},
        {provide: AuthService, useValue: authService},
        {provide: SessionService, useValue: jasmine.createSpyObj<SessionService>('SessionService', ['load'])},
        {provide: ActivatedRoute, useValue: {snapshot: {queryParamMap: convertToParamMap({})}}},
      ],
    })
      .overrideComponent(AuthCardComponent, {set: {imports: [], template: '<ng-content select="[card-corner]"></ng-content><ng-content></ng-content>'}})
      .compileComponents();
  });

  it('lets password managers suggest a new password and submits once', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.componentInstance.email = 'alice@example.com';
    fixture.componentInstance.password = 'a'.repeat(8);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#emailInput')!.getAttribute('autocomplete')).toBe('username');
    expect(element.querySelector('#passwordInput')!.getAttribute('autocomplete')).toBe('new-password');

    element.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(authService.register).toHaveBeenCalledTimes(1);
  });
});
