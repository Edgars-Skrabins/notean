import {Routes} from '@angular/router';
import {CreateWorkspaceComponent} from "../pages/create-workspace/create-workspace.component";
import {JoinWorkspaceComponent} from "../pages/join-workspace/join-workspace.component";
import {DashboardComponent} from "../pages/dashboard/dashboard.component";
import {RegisterComponent} from "@pages/register/register.component";
import {LoginComponent} from "@pages/login/login.component";

export enum AppRoutes {
  JOIN_WORKSPACE = 'join-workspace',
  CREATE_WORKSPACE = 'create-workspace',
  DASHBOARD = 'dashboard',
  REGISTER = 'register',
  LOGIN = 'login',
}

export const routes: Routes = [
  {path: '', redirectTo: '/register', pathMatch: 'full'},
  {path: AppRoutes.JOIN_WORKSPACE, component: JoinWorkspaceComponent},
  {path: AppRoutes.CREATE_WORKSPACE, component: CreateWorkspaceComponent},
  {path: AppRoutes.DASHBOARD, component: DashboardComponent},
  {path: AppRoutes.REGISTER, component: RegisterComponent},
  {path: AppRoutes.LOGIN, component: LoginComponent},
];
