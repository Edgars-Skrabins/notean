import {Routes} from '@angular/router';
import {LoginComponent} from "../pages/login/login.component";
import {RegisterComponent} from "../pages/register/register.component";
import {TeamSelectionComponent} from "../pages/team-selection/team-selection.component";
import {CreateTeamComponent} from "../pages/create-team/create-team.component";
import {JoinTeamComponent} from "../pages/join-team/join-team.component";
import {SwitchTeamComponent} from "../pages/switch-team/switch-team.component";
import {ManageTeamComponent} from "../pages/manage-team/manage-team.component";
import {ProfileComponent} from "../pages/dashboard/profile/profile.component";
import {SettingsComponent} from "../pages/dashboard/settings/settings.component";
import {authGuard} from "../guards/auth.guard";
import {teamGuard} from "../guards/team.guard";
import {teamRoleGuard} from "../guards/team-role.guard";
import {unsavedChangesGuard} from "../guards/unsaved-changes.guard";
import {unknownRouteRedirect} from "../guards/unknown-route.redirect";
import {AppRoutes} from "./app-routes.enum";

export const routes: Routes = [
  {path: '', redirectTo: '/login', pathMatch: 'full'},
  {path: AppRoutes.LOGIN, component: LoginComponent},
  {path: AppRoutes.REGISTER, component: RegisterComponent},
  {path: AppRoutes.TEAM_SELECTION, component: TeamSelectionComponent, canActivate: [authGuard]},
  {path: AppRoutes.CREATE_TEAM, component: CreateTeamComponent, canActivate: [authGuard]},
  {path: AppRoutes.JOIN_TEAM, component: JoinTeamComponent, canActivate: [authGuard]},
  {path: AppRoutes.SWITCH_TEAM, component: SwitchTeamComponent, canActivate: [authGuard, teamGuard]},
  {path: AppRoutes.MANAGE_TEAM, component: ManageTeamComponent, canActivate: [authGuard, teamGuard, teamRoleGuard]},
  {path: AppRoutes.PROFILE, component: ProfileComponent, canActivate: [authGuard, teamGuard], canDeactivate: [unsavedChangesGuard]},
  {path: AppRoutes.SETTINGS, component: SettingsComponent, canActivate: [authGuard, teamGuard], canDeactivate: [unsavedChangesGuard]},
  {
    path: AppRoutes.DASHBOARD,
    loadComponent: () => import('../pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard, teamGuard],
    loadChildren: () => import('./dashboard.routes').then((m) => m.dashboardRoutes),
  },
  {path: '**', redirectTo: unknownRouteRedirect},
];
