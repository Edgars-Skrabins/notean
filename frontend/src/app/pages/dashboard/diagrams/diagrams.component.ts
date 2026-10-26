import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AsyncPipe, NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {DiagramService} from "@services/diagram.service";
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {FavoriteService} from "@services/favorite.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {FolderItemType} from "@models/folder.model";
import {AppRoutes} from "../../../app/app-routes.enum";
import {ButtonComponent} from "@components/button/button.component";
import {ItemTreeComponent} from "@components/item-tree/item-tree.component";
import {CreateNamedItemDialogComponent} from "@components/create-named-item-dialog/create-named-item-dialog.component";
import {FolderProjectDialogComponent} from "@components/folder-project-dialog/folder-project-dialog.component";
import {FolderedListPageComponent} from "../foldered-list-page.base";

@Component({
  selector: 'app-diagrams',
  imports: [
    FormsModule,
    NgIf,
    AsyncPipe,
    TranslatePipe,
    ButtonComponent,
    ItemTreeComponent,
    CreateNamedItemDialogComponent,
    FolderProjectDialogComponent
  ],
  templateUrl: './diagrams.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './diagrams.component.css'
})
export class DiagramsComponent extends FolderedListPageComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly itemType: FolderItemType = 'Diagram';
  protected readonly itemRoute = AppRoutes.DIAGRAMS;

  constructor(
    diagramService: DiagramService,
    folderService: FolderService,
    teamService: TeamService,
    favoriteService: FavoriteService,
    router: Router,
    projectFilterService: ProjectFilterService
  ) {
    super(diagramService, folderService, teamService, favoriteService, router, projectFilterService);
  }
}
