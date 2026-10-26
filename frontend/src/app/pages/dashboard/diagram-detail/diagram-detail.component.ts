import {Component, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TranslateService} from "@ngx-translate/core";
import {NgIf} from '@angular/common';
import {DiagramService} from "@services/diagram.service";
import {DiagramEditingService} from "@services/diagram-editing.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {NavigationService} from "@services/navigation.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {FolderService} from "@services/folder.service";
import {PHRASES} from "@config/phrases";
import {AppRoutes} from "../../../app/app-routes.enum";
import {FlowchartEditorComponent} from "@components/flowchart-editor/flowchart-editor.component";
import {ItemDetailLayoutComponent} from "@components/item-detail-layout/item-detail-layout.component";
import {FolderedItemDetailComponent} from "../foldered-item-detail.base";

@Component({
  selector: 'app-diagram-detail',
  imports: [
    NgIf,
    FlowchartEditorComponent,
    ItemDetailLayoutComponent
  ],
  templateUrl: './diagram-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './diagram-detail.component.css'
})
export class DiagramDetailComponent extends FolderedItemDetailComponent {
  protected readonly favoriteType = 'Diagram';
  protected readonly itemType = 'Diagram';
  protected readonly listRoute = AppRoutes.DIAGRAMS;
  protected readonly untitledItemPhrase = PHRASES.UNTITLED_DIAGRAM;

  constructor(
    route: ActivatedRoute,
    diagramService: DiagramService,
    diagramEditingService: DiagramEditingService,
    teamService: TeamService,
    authService: AuthService,
    navigationService: NavigationService,
    favoriteService: FavoriteService,
    toastService: ToastService,
    projectFilterService: ProjectFilterService,
    folderService: FolderService,
    translateService: TranslateService
  ) {
    super(route, diagramService, diagramEditingService, teamService, authService, navigationService, favoriteService, toastService, projectFilterService, folderService, translateService);
  }
}
