import {Routes} from '@angular/router';
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
import {TrashComponent} from "../pages/dashboard/trash/trash.component";
import {unsavedChangesGuard} from "../guards/unsaved-changes.guard";
import {featureGuard} from "../guards/feature.guard";
import {TemplatesComponent} from "../pages/dashboard/templates/templates.component";
import {TemplateDetailComponent} from "../pages/dashboard/template-detail/template-detail.component";
import {BoardTemplateDetailComponent} from "../pages/dashboard/board-template-detail/board-template-detail.component";
import {AppRoutes} from "./app-routes.enum";

export const dashboardRoutes: Routes = [
  {path: '', redirectTo: AppRoutes.DASHBOARD_HOME, pathMatch: 'full'},
  {path: AppRoutes.DASHBOARD_HOME, component: HomeComponent},
  {path: AppRoutes.PROJECTS, component: ProjectsComponent},
  {path: AppRoutes.TRASH, component: TrashComponent},
  {path: `${AppRoutes.PROJECTS}/:id`, component: ProjectDetailComponent, canDeactivate: [unsavedChangesGuard]},
  {path: AppRoutes.DOCUMENT_PAGES, component: DocumentPagesComponent, canActivate: [featureGuard('pages')]},
  {path: `${AppRoutes.DOCUMENT_PAGES}/${AppRoutes.TEMPLATES}`, component: TemplatesComponent, canActivate: [featureGuard('pages')], data: {kind: 'page'}},
  {path: `${AppRoutes.DOCUMENT_PAGES}/${AppRoutes.TEMPLATES}/${AppRoutes.NEW}`, component: TemplateDetailComponent, canActivate: [featureGuard('pages')], data: {kind: 'page'}},
  {path: `${AppRoutes.DOCUMENT_PAGES}/${AppRoutes.TEMPLATES}/${AppRoutes.BUILTIN}/:key`, component: TemplateDetailComponent, canActivate: [featureGuard('pages')], data: {kind: 'page'}},
  {path: `${AppRoutes.DOCUMENT_PAGES}/${AppRoutes.TEMPLATES}/:id`, component: TemplateDetailComponent, canActivate: [featureGuard('pages')], data: {kind: 'page'}},
  {path: `${AppRoutes.DOCUMENT_PAGES}/${AppRoutes.NEW}`, component: PageDetailComponent, canActivate: [featureGuard('pages')]},
  {path: `${AppRoutes.DOCUMENT_PAGES}/:id`, component: PageDetailComponent, canActivate: [featureGuard('pages')]},
  {path: AppRoutes.DIAGRAMS, component: DiagramsComponent, canActivate: [featureGuard('diagrams')]},
  {path: `${AppRoutes.DIAGRAMS}/${AppRoutes.TEMPLATES}`, component: TemplatesComponent, canActivate: [featureGuard('diagrams')], data: {kind: 'diagram'}},
  {path: `${AppRoutes.DIAGRAMS}/${AppRoutes.TEMPLATES}/${AppRoutes.NEW}`, component: TemplateDetailComponent, canActivate: [featureGuard('diagrams')], data: {kind: 'diagram'}},
  {path: `${AppRoutes.DIAGRAMS}/${AppRoutes.TEMPLATES}/${AppRoutes.BUILTIN}/:key`, component: TemplateDetailComponent, canActivate: [featureGuard('diagrams')], data: {kind: 'diagram'}},
  {path: `${AppRoutes.DIAGRAMS}/${AppRoutes.TEMPLATES}/:id`, component: TemplateDetailComponent, canActivate: [featureGuard('diagrams')], data: {kind: 'diagram'}},
  {path: AppRoutes.BOARD_TEMPLATES, component: TemplatesComponent, canActivate: [featureGuard('boards')], data: {kind: 'board'}},
  {path: `${AppRoutes.BOARD_TEMPLATES}/${AppRoutes.NEW}`, component: BoardTemplateDetailComponent, canActivate: [featureGuard('boards')]},
  {path: `${AppRoutes.BOARD_TEMPLATES}/:id`, component: BoardTemplateDetailComponent, canActivate: [featureGuard('boards')]},
  {path: `${AppRoutes.DIAGRAMS}/${AppRoutes.NEW}`, component: DiagramDetailComponent, canActivate: [featureGuard('diagrams')]},
  {path: `${AppRoutes.DIAGRAMS}/:id`, component: DiagramDetailComponent, canActivate: [featureGuard('diagrams')]},
  {
    path: `${AppRoutes.BOARDS}/:id`,
    component: BoardPageComponent,
    canActivate: [featureGuard('boards')],
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
];
