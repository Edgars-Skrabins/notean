import {Routes} from '@angular/router';
import {LoginComponent} from "../pages/login/login.component";
import {RegisterComponent} from "../pages/register/register.component";
import {TeamSelectionComponent} from "../pages/team-selection/team-selection.component";
import {CreateTeamComponent} from "../pages/create-team/create-team.component";
import {JoinTeamComponent} from "../pages/join-team/join-team.component";
import {SwitchTeamComponent} from "../pages/switch-team/switch-team.component";
import {UnavailableComponent} from "../pages/unavailable/unavailable.component";
import {authGuard} from "../guards/auth.guard";
import {teamGuard} from "../guards/team.guard";
import {teamLinkGuard} from "../guards/team-link.guard";
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
  {path: AppRoutes.MANAGE_TEAM, redirectTo: `/${AppRoutes.DASHBOARD}/${AppRoutes.MANAGE_TEAM}`, pathMatch: 'full'},
  {path: AppRoutes.PROFILE, redirectTo: `/${AppRoutes.DASHBOARD}/${AppRoutes.PROFILE}`, pathMatch: 'full'},
  {path: AppRoutes.SETTINGS, redirectTo: `/${AppRoutes.DASHBOARD}/${AppRoutes.SETTINGS}`, pathMatch: 'full'},
  {
    path: AppRoutes.DASHBOARD,
    loadComponent: () => import('../pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard, teamLinkGuard, teamGuard],
    runGuardsAndResolvers: 'always',
    loadChildren: () => import('./dashboard.routes').then((m) => m.dashboardRoutes),
  },
  {path: AppRoutes.UNAVAILABLE, component: UnavailableComponent, canActivate: [authGuard]},
  {path: '**', redirectTo: unknownRouteRedirect},
];
