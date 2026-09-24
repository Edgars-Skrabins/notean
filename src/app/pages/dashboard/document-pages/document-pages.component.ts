import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {PageService} from "@services/page.service";
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {PageSummary} from "@models/page.model";
import {ButtonComponent} from "@components/button/button.component";
import {ItemTreeComponent, TreeFolder, TreeItem} from "@components/item-tree/item-tree.component";

@Component({
  selector: 'app-document-pages',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    ButtonComponent,
    ItemTreeComponent
  ],
  templateUrl: './document-pages.component.html',
  styleUrl: './document-pages.component.css'
})
export class DocumentPagesComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  folders: TreeFolder[] = [];
  items: TreeItem[] = [];
  searchQuery = '';
  isLoading = true;
  alertMessage = '';

  private teamCode: string;
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;
  private requestSequence = 0;

  constructor(
    private router: Router,
    private pageService: PageService,
    private folderService: FolderService,
    private teamService: TeamService,
    private translateService: TranslateService
  ) {
    this.teamCode = this.teamService.getCurrentTeam()!.code;
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }
  }

  handleSearchChange() {
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }
    this.searchDebounceHandle = setTimeout(() => this.loadData(), 300);
  }

  handleOpenPage(item: TreeItem) {
    this.router.navigate(['/dashboard/pages', item.id]);
  }

  handleCreateFolder(parentId: number | null) {
    const untitledTitle = this.translateService.instant(PHRASES.UNTITLED_FOLDER);

    this.folderService.createFolder(this.teamCode, 'Page', untitledTitle, parentId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
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
          this.router.navigate(['/dashboard/pages', pageId], {queryParams: {edit: true}});
        });
      });
  }

  handleMoveItem(event: { itemId: number; folderId: number | null }) {
    this.pageService.moveToFolder(this.teamCode, event.itemId, event.folderId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  handleMoveFolder(event: { folderId: number; parentId: number | null }) {
    this.folderService.moveFolder(this.teamCode, event.folderId, event.parentId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  handleDeleteFolder(event: { folderId: number; mode: 'cascade' | 'promote' }) {
    this.folderService.deleteFolder(this.teamCode, event.folderId, event.mode)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  private loadData() {
    const sequence = ++this.requestSequence;
    this.isLoading = true;

    Promise.all([
      this.folderService.listFolders(this.teamCode, 'Page'),
      this.pageService.listPages(this.teamCode, this.searchQuery || undefined)
    ]).then(([foldersResponse, pagesResponse]) => {
      if (sequence !== this.requestSequence) {
        return;
      }
      this.isLoading = false;

      if (!foldersResponse.success) {
        this.alertMessage = foldersResponse.statusMessage;
        return;
      }
      if (!pagesResponse.success) {
        this.alertMessage = pagesResponse.statusMessage;
        return;
      }

      this.alertMessage = '';
      this.folders = foldersResponse.folders.map((folder) => ({
        id: folder.id,
        title: folder.title,
        parentId: folder.parentId,
      }));
      this.items = pagesResponse.pages.map((page) => this.toTreeItem(page));
    });
  }

  private toTreeItem(page: PageSummary): TreeItem {
    return {
      id: page.id,
      title: page.title,
      folderId: page.folderId,
      meta: {
        creator: {username: page.creator.username},
        updatedAt: page.updatedAt,
      },
    };
  }
}
