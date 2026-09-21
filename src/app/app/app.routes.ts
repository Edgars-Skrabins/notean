import {Routes} from '@angular/router';
import {LoginComponent} from "../pages/login/login.component";
import {RegisterComponent} from "../pages/register/register.component";
import {DashboardComponent} from "../pages/dashboard/dashboard.component";
import {authGuard} from "../guards/auth.guard";

export enum AppRoutes {
  LOGIN = 'login',
  REGISTER = 'register',
  DASHBOARD = 'dashboard',
}

export const routes: Routes = [
  {path: '', redirectTo: '/login', pathMatch: 'full'},
  {path: AppRoutes.LOGIN, component: LoginComponent},
  {path: AppRoutes.REGISTER, component: RegisterComponent},
  {path: AppRoutes.DASHBOARD, component: DashboardComponent, canActivate: [authGuard]},
];
