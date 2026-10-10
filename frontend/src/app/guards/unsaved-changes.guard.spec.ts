import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {AuthService} from '@services/auth.service';
import {HasUnsavedChanges} from '@models/unsaved-changes.model';
import {unsavedChangesGuard} from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  let isAuthenticated: boolean;

  function runGuard(component: HasUnsavedChanges) {
    return TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(component, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot)
    );
  }

  beforeEach(() => {
    isAuthenticated = true;
    TestBed.configureTestingModule({
      providers: [{provide: AuthService, useValue: {isAuthenticated: () => isAuthenticated}}]
    });
  });

  it('allows leaving without asking when the user is logged out', () => {
    const component = jasmine.createSpyObj<HasUnsavedChanges>('component', ['confirmLeave']);
    isAuthenticated = false;

    expect(runGuard(component)).toBeTrue();
    expect(component.confirmLeave).not.toHaveBeenCalled();
  });

  it('returns the component answer when the user is logged in', async () => {
    const component = jasmine.createSpyObj<HasUnsavedChanges>('component', {confirmLeave: Promise.resolve(false)});

    expect(await runGuard(component)).toBeFalse();
    expect(component.confirmLeave).toHaveBeenCalled();
  });
});
