import {Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {NgIf} from '@angular/common';
import {PageService} from "@services/page.service";
import {PageEditingService} from "@services/page-editing.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {NavigationService} from "@services/navigation.service";
import {FavoriteService} from "@services/favorite.service";
import {AppRoutes} from "../../../app/app-routes.enum";
import {RichTextEditorComponent} from "@components/rich-text-editor/rich-text-editor.component";
import {ItemDetailLayoutComponent} from "@components/item-detail-layout/item-detail-layout.component";
import {FolderedItemDetailComponent} from "../foldered-item-detail.base";

@Component({
  selector: 'app-page-detail',
  standalone: true,
  imports: [
    NgIf,
    RichTextEditorComponent,
    ItemDetailLayoutComponent
  ],
  templateUrl: './page-detail.component.html',
  styleUrl: './page-detail.component.css'
})
export class PageDetailComponent extends FolderedItemDetailComponent {
  protected readonly favoriteType = 'Page';
  protected readonly listRoute = AppRoutes.DOCUMENT_PAGES;

  constructor(
    route: ActivatedRoute,
    pageService: PageService,
    pageEditingService: PageEditingService,
    teamService: TeamService,
    authService: AuthService,
    navigationService: NavigationService,
    favoriteService: FavoriteService
  ) {
    super(route, pageService, pageEditingService, teamService, authService, navigationService, favoriteService);
  }
}
