import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AsyncPipe, NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {PageService} from "@services/page.service";
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
  selector: 'app-document-pages',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    AsyncPipe,
    TranslateModule,
    ButtonComponent,
    ItemTreeComponent,
    CreateNamedItemDialogComponent,
    FolderProjectDialogComponent
  ],
  templateUrl: './document-pages.component.html',
  styleUrl: './document-pages.component.css'
})
export class DocumentPagesComponent extends FolderedListPageComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly itemType: FolderItemType = 'Page';
  protected readonly itemRoute = AppRoutes.DOCUMENT_PAGES;

  constructor(
    pageService: PageService,
    folderService: FolderService,
    teamService: TeamService,
    favoriteService: FavoriteService,
    router: Router,
    projectFilterService: ProjectFilterService
  ) {
    super(pageService, folderService, teamService, favoriteService, router, projectFilterService);
  }
}
