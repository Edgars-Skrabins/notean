import {Routes} from '@angular/router';
import {LoginComponent} from "../pages/login/login.component";
import {RegisterComponent} from "../pages/register/register.component";
import {TeamSelectionComponent} from "../pages/team-selection/team-selection.component";
import {CreateTeamComponent} from "../pages/create-team/create-team.component";
import {JoinTeamComponent} from "../pages/join-team/join-team.component";
import {DashboardComponent} from "../pages/dashboard/dashboard.component";
import {HomeComponent} from "../pages/dashboard/home/home.component";
import {ProjectsComponent} from "../pages/dashboard/projects/projects.component";
import {DocumentPagesComponent} from "../pages/dashboard/document-pages/document-pages.component";
import {PageDetailComponent} from "../pages/dashboard/page-detail/page-detail.component";
import {DiagramsComponent} from "../pages/dashboard/diagrams/diagrams.component";
import {DiagramDetailComponent} from "../pages/dashboard/diagram-detail/diagram-detail.component";
import {KanbanBoardsComponent} from "../pages/dashboard/kanban-boards/kanban-boards.component";
import {ProfileComponent} from "../pages/dashboard/profile/profile.component";
import {SettingsComponent} from "../pages/dashboard/settings/settings.component";
import {authGuard} from "../guards/auth.guard";
import {teamGuard} from "../guards/team.guard";
import {AppRoutes} from "./app-routes.enum";

export const routes: Routes = [
  {path: '', redirectTo: '/login', pathMatch: 'full'},
  {path: AppRoutes.LOGIN, component: LoginComponent},
  {path: AppRoutes.REGISTER, component: RegisterComponent},
  {path: AppRoutes.TEAM_SELECTION, component: TeamSelectionComponent, canActivate: [authGuard]},
  {path: AppRoutes.CREATE_TEAM, component: CreateTeamComponent, canActivate: [authGuard]},
  {path: AppRoutes.JOIN_TEAM, component: JoinTeamComponent, canActivate: [authGuard]},
  {path: AppRoutes.PROFILE, component: ProfileComponent, canActivate: [authGuard, teamGuard]},
  {path: AppRoutes.SETTINGS, component: SettingsComponent, canActivate: [authGuard, teamGuard]},
  {
    path: AppRoutes.DASHBOARD,
    component: DashboardComponent,
    canActivate: [authGuard, teamGuard],
    children: [
      {path: '', redirectTo: AppRoutes.DASHBOARD_HOME, pathMatch: 'full'},
      {path: AppRoutes.DASHBOARD_HOME, component: HomeComponent},
      {path: AppRoutes.PROJECTS, component: ProjectsComponent},
      {path: AppRoutes.DOCUMENT_PAGES, component: DocumentPagesComponent},
      {path: `${AppRoutes.DOCUMENT_PAGES}/:id`, component: PageDetailComponent},
      {path: AppRoutes.DIAGRAMS, component: DiagramsComponent},
      {path: `${AppRoutes.DIAGRAMS}/:id`, component: DiagramDetailComponent},
      {path: AppRoutes.KANBAN_BOARDS, component: KanbanBoardsComponent},
    ],
  },
];
