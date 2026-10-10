import {Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {NgIf} from '@angular/common';
import {DiagramService} from "@services/diagram.service";
import {DiagramEditingService} from "@services/diagram-editing.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {NavigationService} from "@services/navigation.service";
import {FavoriteService} from "@services/favorite.service";
import {AppRoutes} from "../../../app/app-routes.enum";
import {FlowchartEditorComponent} from "@components/flowchart-editor/flowchart-editor.component";
import {ItemDetailLayoutComponent} from "@components/item-detail-layout/item-detail-layout.component";
import {FolderedItemDetailComponent} from "../foldered-item-detail.base";

@Component({
  selector: 'app-diagram-detail',
  standalone: true,
  imports: [
    NgIf,
    FlowchartEditorComponent,
    ItemDetailLayoutComponent
  ],
  templateUrl: './diagram-detail.component.html',
  styleUrl: './diagram-detail.component.css'
})
export class DiagramDetailComponent extends FolderedItemDetailComponent {
  protected readonly favoriteType = 'Diagram';
  protected readonly listRoute = AppRoutes.DIAGRAMS;

  constructor(
    route: ActivatedRoute,
    diagramService: DiagramService,
    diagramEditingService: DiagramEditingService,
    teamService: TeamService,
    authService: AuthService,
    navigationService: NavigationService,
    favoriteService: FavoriteService
  ) {
    super(route, diagramService, diagramEditingService, teamService, authService, navigationService, favoriteService);
  }
}
