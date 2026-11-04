import {Route} from '@angular/router';
import {routes} from './app.routes';
import {AppRoutes} from './app-routes.enum';
import {SwitchTeamComponent} from '@pages/switch-team/switch-team.component';

describe('routes', () => {
  function route(path: string): Route | undefined {
    return routes.find((candidate) => candidate.path === path);
  }

  it('redirects the old account page URLs into the dashboard', () => {
    expect(route(AppRoutes.SETTINGS)?.redirectTo).toBe('/dashboard/settings');
    expect(route(AppRoutes.PROFILE)?.redirectTo).toBe('/dashboard/profile');
    expect(route(AppRoutes.MANAGE_TEAM)?.redirectTo).toBe('/dashboard/manage-team');
  });

  it('redirects only the exact old URLs', () => {
    [AppRoutes.SETTINGS, AppRoutes.PROFILE, AppRoutes.MANAGE_TEAM].forEach((path) => {
      expect(route(path)?.pathMatch).toBe('full');
      expect(route(path)?.component).toBeUndefined();
    });
  });

  it('keeps Switch team as a top-level screen', () => {
    expect(route(AppRoutes.SWITCH_TEAM)?.component).toBe(SwitchTeamComponent);
  });
});
