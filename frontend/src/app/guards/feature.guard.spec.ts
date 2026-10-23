import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {TeamService} from '@services/team.service';
import {TeamFeature} from '@models/team.model';
import {featureGuard} from './feature.guard';

describe('featureGuard', () => {
  let enabled: Record<TeamFeature, boolean>;
  let router: jasmine.SpyObj<Router>;

  function runGuard(feature: TeamFeature) {
    return TestBed.runInInjectionContext(() =>
      featureGuard(feature)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  }

  beforeEach(() => {
    enabled = {pages: true, diagrams: true, boards: true};
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        {provide: TeamService, useValue: {isFeatureEnabled: (feature: TeamFeature) => enabled[feature]}},
        {provide: Router, useValue: router},
      ]
    });
  });

  it('allows an enabled feature', () => {
    expect(runGuard('boards')).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects a disabled feature to Home', () => {
    enabled.boards = false;

    expect(runGuard('boards')).toBeFalse();
    expect(router.navigate).toHaveBeenCalledOnceWith(['dashboard', 'home']);
  });

  it('checks only its own feature', () => {
    enabled.pages = false;

    expect(runGuard('diagrams')).toBeTrue();
  });
});
