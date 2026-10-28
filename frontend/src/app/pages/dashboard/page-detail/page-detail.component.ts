import {Component, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TranslateService} from "@ngx-translate/core";
import {NgIf} from '@angular/common';
import {PageService} from "@services/page.service";
import {PageEditingService} from "@services/page-editing.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {NavigationService} from "@services/navigation.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {FolderService} from "@services/folder.service";
import {CopyLinkService} from "@services/copy-link.service";
import {PHRASES} from "@config/phrases";
import {AppRoutes} from "../../../app/app-routes.enum";
import {RichTextEditorComponent} from "@components/rich-text-editor/rich-text-editor.component";
import {ItemDetailLayoutComponent} from "@components/item-detail-layout/item-detail-layout.component";
import {FolderedItemDetailComponent} from "../foldered-item-detail.base";

@Component({
  selector: 'app-page-detail',
  imports: [
    NgIf,
    RichTextEditorComponent,
    ItemDetailLayoutComponent
  ],
  templateUrl: './page-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './page-detail.component.css'
})
export class PageDetailComponent extends FolderedItemDetailComponent {
  protected readonly favoriteType = 'Page';
  protected readonly itemType = 'Page';
  protected readonly listRoute = AppRoutes.DOCUMENT_PAGES;
  protected readonly untitledItemPhrase = PHRASES.UNTITLED_PAGE;
  protected readonly notFoundCode = 'PAGE_NOT_FOUND';

  constructor(
    route: ActivatedRoute,
    pageService: PageService,
    pageEditingService: PageEditingService,
    teamService: TeamService,
    authService: AuthService,
    navigationService: NavigationService,
    favoriteService: FavoriteService,
    toastService: ToastService,
    projectFilterService: ProjectFilterService,
    folderService: FolderService,
    translateService: TranslateService,
    copyLinkService: CopyLinkService
  ) {
    super(route, pageService, pageEditingService, teamService, authService, navigationService, favoriteService, toastService, projectFilterService, folderService, translateService, copyLinkService);
  }
}
