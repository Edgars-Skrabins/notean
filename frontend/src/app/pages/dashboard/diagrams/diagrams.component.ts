import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
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
import {FolderedListPageComponent} from "../foldered-list-page.base";

@Component({
  selector: 'app-diagrams',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    ButtonComponent,
    ItemTreeComponent,
    CreateNamedItemDialogComponent
  ],
  templateUrl: './diagrams.component.html',
  styleUrl: './diagrams.component.css'
})
export class DiagramsComponent extends FolderedListPageComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly itemType: FolderItemType = 'Diagram';
  protected readonly itemRoute = AppRoutes.DIAGRAMS;
  protected readonly untitledItemPhrase = PHRASES.UNTITLED_DIAGRAM;

  constructor(
    diagramService: DiagramService,
    folderService: FolderService,
    teamService: TeamService,
    favoriteService: FavoriteService,
    router: Router,
    translateService: TranslateService,
    projectFilterService: ProjectFilterService
  ) {
    super(diagramService, folderService, teamService, favoriteService, router, translateService, projectFilterService);
  }
}
