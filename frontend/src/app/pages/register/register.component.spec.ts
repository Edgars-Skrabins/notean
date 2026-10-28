import {RegisterComponent} from "./register.component";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {SessionService} from "@services/session.service";
import {PHRASES} from "@config/phrases";
import {fakeAsync, tick} from "@angular/core/testing";
import {ActivatedRoute} from "@angular/router";

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
