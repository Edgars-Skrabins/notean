import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {TeamService} from '@services/team.service';
import {ToastService} from '@services/toast.service';
import {TeamFeature} from '@models/team.model';
import {ToastType} from '@models/toast.model';
import {PHRASES} from '@config/phrases';
import {featureGuard} from './feature.guard';

describe('featureGuard', () => {
  let enabled: Record<TeamFeature, boolean>;
  let router: jasmine.SpyObj<Router>;
  let toastService: jasmine.SpyObj<ToastService>;

  function runGuard(feature: TeamFeature) {
    return TestBed.runInInjectionContext(() =>
      featureGuard(feature)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  }

  beforeEach(() => {
    enabled = {pages: true, diagrams: true, boards: true};
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    TestBed.configureTestingModule({
      providers: [
        {provide: TeamService, useValue: {isFeatureEnabled: (feature: TeamFeature) => enabled[feature]}},
        {provide: Router, useValue: router},
        {provide: ToastService, useValue: toastService},
      ]
    });
  });

  it('allows an enabled feature', () => {
    expect(runGuard('boards')).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(toastService.show).not.toHaveBeenCalled();
  });

  it('redirects a disabled feature to Home with a toast', () => {
    enabled.boards = false;

    expect(runGuard('boards')).toBeFalse();
    expect(router.navigate).toHaveBeenCalledOnceWith(['dashboard', 'home']);
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.INFO, message: PHRASES.FEATURE_TURNED_OFF});
  });

  it('checks only its own feature', () => {
    enabled.pages = false;

    expect(runGuard('diagrams')).toBeTrue();
  });
});
