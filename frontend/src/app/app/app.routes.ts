import {Routes} from '@angular/router';
import {LoginComponent} from "../pages/login/login.component";
import {RegisterComponent} from "../pages/register/register.component";
import {TeamSelectionComponent} from "../pages/team-selection/team-selection.component";
import {CreateTeamComponent} from "../pages/create-team/create-team.component";
import {JoinTeamComponent} from "../pages/join-team/join-team.component";
import {SwitchTeamComponent} from "../pages/switch-team/switch-team.component";
import {ManageTeamComponent} from "../pages/manage-team/manage-team.component";
import {DashboardComponent} from "../pages/dashboard/dashboard.component";
import {HomeComponent} from "../pages/dashboard/home/home.component";
import {ProjectsComponent} from "../pages/dashboard/projects/projects.component";
import {ProjectDetailComponent} from "../pages/dashboard/project-detail/project-detail.component";
import {DocumentPagesComponent} from "../pages/dashboard/document-pages/document-pages.component";
import {PageDetailComponent} from "../pages/dashboard/page-detail/page-detail.component";
import {DiagramsComponent} from "../pages/dashboard/diagrams/diagrams.component";
import {DiagramDetailComponent} from "../pages/dashboard/diagram-detail/diagram-detail.component";
import {BoardPageComponent} from "../pages/dashboard/board-page/board-page.component";
import {BoardOverviewTabComponent} from "../pages/dashboard/board-overview-tab/board-overview-tab.component";
import {KanbanTabComponent} from "../pages/dashboard/kanban-tab/kanban-tab.component";
import {ListTabComponent} from "../pages/dashboard/list-tab/list-tab.component";
import {TicketDetailComponent} from "../pages/dashboard/ticket-detail/ticket-detail.component";
import {ProfileComponent} from "../pages/dashboard/profile/profile.component";
import {SettingsComponent} from "../pages/dashboard/settings/settings.component";
import {authGuard} from "../guards/auth.guard";
import {teamGuard} from "../guards/team.guard";
import {teamRoleGuard} from "../guards/team-role.guard";
import {unsavedChangesGuard} from "../guards/unsaved-changes.guard";
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
    component: DashboardComponent,
    canActivate: [authGuard, teamGuard],
    children: [
      {path: '', redirectTo: AppRoutes.DASHBOARD_HOME, pathMatch: 'full'},
      {path: AppRoutes.DASHBOARD_HOME, component: HomeComponent},
      {path: AppRoutes.PROJECTS, component: ProjectsComponent},
      {path: `${AppRoutes.PROJECTS}/:id`, component: ProjectDetailComponent, canDeactivate: [unsavedChangesGuard]},
      {path: AppRoutes.DOCUMENT_PAGES, component: DocumentPagesComponent},
      {path: `${AppRoutes.DOCUMENT_PAGES}/:id`, component: PageDetailComponent},
      {path: AppRoutes.DIAGRAMS, component: DiagramsComponent},
      {path: `${AppRoutes.DIAGRAMS}/:id`, component: DiagramDetailComponent},
      {
        path: `${AppRoutes.BOARDS}/:id`,
        component: BoardPageComponent,
        children: [
          {path: '', redirectTo: AppRoutes.KANBAN, pathMatch: 'full'},
          {path: AppRoutes.OVERVIEW, component: BoardOverviewTabComponent},
          {
            path: AppRoutes.KANBAN,
            component: KanbanTabComponent,
            children: [{path: `${AppRoutes.TICKETS}/:ticketId`, component: TicketDetailComponent}],
          },
          {path: AppRoutes.LEGACY_BACKLOG, redirectTo: AppRoutes.LIST, pathMatch: 'full'},
          {path: `${AppRoutes.LEGACY_BACKLOG}/${AppRoutes.TICKETS}/:ticketId`, redirectTo: `${AppRoutes.LIST}/${AppRoutes.TICKETS}/:ticketId`},
          {
            path: AppRoutes.LIST,
            component: ListTabComponent,
            children: [{path: `${AppRoutes.TICKETS}/:ticketId`, component: TicketDetailComponent}],
          },
        ],
      },
    ],
  },
];
