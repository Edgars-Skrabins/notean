import {Routes} from '@angular/router';
import {CreateWorkspaceComponent} from "../pages/create-workspace/create-workspace.component";
import {JoinWorkspaceComponent} from "../pages/join-workspace/join-workspace.component";
import {DashboardComponent} from "../pages/dashboard/dashboard.component";
import {RegisterComponent} from "@pages/register/register.component";
import {LoginComponent} from "@pages/login/login.component";

export enum AppRoutes {
  LOGIN = 'login',
  REGISTER = 'register',
  JOIN_WORKSPACE = 'join-workspace',
  CREATE_WORKSPACE = 'create-workspace',
  DASHBOARD = 'dashboard',
}

export const routes: Routes = [
  {path: '', redirectTo: AppRoutes.LOGIN, pathMatch: 'full'},
  {path: AppRoutes.LOGIN, component: LoginComponent},
  {path: AppRoutes.REGISTER, component: RegisterComponent},
  {path: AppRoutes.JOIN_WORKSPACE, component: JoinWorkspaceComponent},
  {path: AppRoutes.CREATE_WORKSPACE, component: CreateWorkspaceComponent},
  {path: AppRoutes.DASHBOARD, component: DashboardComponent},
];
