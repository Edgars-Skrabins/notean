import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {PageService} from "@services/page.service";
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {FolderItemType} from "@models/folder.model";
import {AppRoutes} from "../../../app/app-routes.enum";
import {ButtonComponent} from "@components/button/button.component";
import {ItemTreeComponent, TreeItem} from "@components/item-tree/item-tree.component";
import {CreateNamedItemDialogComponent} from "@components/create-named-item-dialog/create-named-item-dialog.component";
import {FolderedItemSummary, FolderedListPageComponent} from "../foldered-list-page.base";

@Component({
  selector: 'app-document-pages',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    ButtonComponent,
    ItemTreeComponent,
    CreateNamedItemDialogComponent
  ],
  templateUrl: './document-pages.component.html',
  styleUrl: './document-pages.component.css'
})
export class DocumentPagesComponent extends FolderedListPageComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly itemType: FolderItemType = 'Page';

  constructor(
    private router: Router,
    private pageService: PageService,
    folderService: FolderService,
    teamService: TeamService,
    private translateService: TranslateService
  ) {
    super(folderService, teamService);
  }

  handleOpenPage(item: TreeItem) {
    this.router.navigate([AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, item.id]);
  }

  handleCreatePage(parentId: number | null) {
    const untitledTitle = this.translateService.instant(PHRASES.UNTITLED_PAGE);

    this.pageService.createPage(this.teamCode, untitledTitle)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        const pageId = response.page.id;
        const afterMove = parentId !== null
          ? this.pageService.moveToFolder(this.teamCode, pageId, parentId)
          : Promise.resolve(response);

        afterMove.then(() => {
          this.router.navigate([AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, pageId], {queryParams: {edit: true}});
        });
      });
  }

  protected listItems(search?: string): Promise<
    | { success: true; items: FolderedItemSummary[] }
    | { success: false; statusMessage: string }
  > {
    return this.pageService.listPages(this.teamCode, search).then((response) => {
      if (!response.success) {
        return response;
      }
      return {success: true, items: response.pages};
    });
  }

  protected moveItemToFolder(itemId: number, folderId: number | null) {
    return this.pageService.moveToFolder(this.teamCode, itemId, folderId);
  }

  protected deleteItemById(itemId: number) {
    return this.pageService.deletePage(this.teamCode, itemId);
  }
}
