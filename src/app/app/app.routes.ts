import {Routes} from '@angular/router';
import {LoginComponent} from "../pages/login/login.component";
import {RegisterComponent} from "../pages/register/register.component";
import {TeamSelectionComponent} from "../pages/team-selection/team-selection.component";
import {CreateTeamComponent} from "../pages/create-team/create-team.component";
import {JoinTeamComponent} from "../pages/join-team/join-team.component";
import {DashboardComponent} from "../pages/dashboard/dashboard.component";
import {authGuard} from "../guards/auth.guard";

export enum AppRoutes {
  LOGIN = 'login',
  REGISTER = 'register',
  TEAM_SELECTION = 'team-selection',
  CREATE_TEAM = 'create-team',
  JOIN_TEAM = 'join-team',
  DASHBOARD = 'dashboard',
}

export const routes: Routes = [
  {path: '', redirectTo: '/login', pathMatch: 'full'},
  {path: AppRoutes.LOGIN, component: LoginComponent},
  {path: AppRoutes.REGISTER, component: RegisterComponent},
  {path: AppRoutes.TEAM_SELECTION, component: TeamSelectionComponent, canActivate: [authGuard]},
  {path: AppRoutes.CREATE_TEAM, component: CreateTeamComponent, canActivate: [authGuard]},
  {path: AppRoutes.JOIN_TEAM, component: JoinTeamComponent, canActivate: [authGuard]},
  {path: AppRoutes.DASHBOARD, component: DashboardComponent, canActivate: [authGuard]},
];
