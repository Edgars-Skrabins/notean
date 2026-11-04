import {Route} from '@angular/router';
import {dashboardRoutes} from './dashboard.routes';
import {AppRoutes} from './app-routes.enum';
import {unsavedChangesGuard} from '../guards/unsaved-changes.guard';
import {teamRoleGuard} from '../guards/team-role.guard';
import {SettingsComponent} from '@pages/dashboard/settings/settings.component';
import {ProfileComponent} from '@pages/dashboard/profile/profile.component';
import {ManageTeamComponent} from '@pages/manage-team/manage-team.component';

describe('dashboardRoutes', () => {
  function route(path: string): Route | undefined {
    return dashboardRoutes.find((candidate) => candidate.path === path);
  }

  it('serves Settings with the unsaved changes guard', () => {
    const settings = route(AppRoutes.SETTINGS);

    expect(settings?.component).toBe(SettingsComponent);
    expect(settings?.canDeactivate).toEqual([unsavedChangesGuard]);
  });

  it('serves Profile with the unsaved changes guard', () => {
    const profile = route(AppRoutes.PROFILE);

    expect(profile?.component).toBe(ProfileComponent);
    expect(profile?.canDeactivate).toEqual([unsavedChangesGuard]);
  });

  it('serves Manage team only through the team role guard', () => {
    const manageTeam = route(AppRoutes.MANAGE_TEAM);

    expect(manageTeam?.component).toBe(ManageTeamComponent);
    expect(manageTeam?.canActivate).toEqual([teamRoleGuard]);
  });
});
