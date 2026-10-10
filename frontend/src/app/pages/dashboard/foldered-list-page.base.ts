import {Directive, OnDestroy, OnInit} from '@angular/core';
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {FavoriteService} from "@services/favorite.service";
import {FolderDeleteMode, FolderItemType} from "@models/folder.model";
import {TreeFolder, TreeItem} from "@components/item-tree/item-tree.component";
import {errorPhrase} from "@utils/errorPhrase";
import {Router} from "@angular/router";
import {TranslateService} from "@ngx-translate/core";
import {ErrorCode} from "@config/errorCodes";
import {FolderedItemSummary} from "@models/foldered-item.model";
import {FolderedItemService} from "@services/foldered-item.service";
import {AppRoutes} from "../../app/app-routes.enum";

@Directive()
export abstract class FolderedListPageComponent implements OnInit, OnDestroy {
  protected abstract readonly itemType: FolderItemType;
  protected abstract readonly itemRoute: AppRoutes;
  protected abstract readonly untitledItemPhrase: string;

  folders: TreeFolder[] = [];
  items: TreeItem[] = [];
  searchQuery = '';
  isLoading = true;
  alertMessage = '';
  isCreateFolderDialogOpen = false;

  protected readonly teamCode: string;
  private pendingCreateFolderParentId: number | null = null;
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;
  private requestSequence = 0;

  protected constructor(
    private itemService: FolderedItemService<ErrorCode>,
    private folderService: FolderService,
    private teamService: TeamService,
    private favoriteService: FavoriteService,
    private router: Router,
    private translateService: TranslateService
  ) {
    this.teamCode = this.teamService.getCurrentTeamCode();
  }

  handleOpenItem(item: TreeItem) {
    this.router.navigate([AppRoutes.DASHBOARD, this.itemRoute, item.id]);
  }

  handleCreateItem(parentId: number | null) {
    const untitledTitle = this.translateService.instant(this.untitledItemPhrase);

    this.itemService.create(this.teamCode, untitledTitle)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        const itemId = response.item.id;
        const afterMove = parentId !== null
          ? this.itemService.moveToFolder(this.teamCode, itemId, parentId)
          : Promise.resolve(response);

        afterMove.then(() => {
          this.router.navigate([AppRoutes.DASHBOARD, this.itemRoute, itemId], {queryParams: {edit: true}});
        });
      });
  }

  get isSearching(): boolean {
    return this.searchQuery.trim().length > 0;
  }

  get displayFolders(): TreeFolder[] {
    return this.isSearching ? [] : this.folders;
  }

  get displayItems(): TreeItem[] {
    if (!this.isSearching) {
      return this.items;
    }

    return this.items.map((item) => ({...item, folderId: null}));
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

  handleCreateFolder(parentId: number | null) {
    this.pendingCreateFolderParentId = parentId;
    this.isCreateFolderDialogOpen = true;
  }

  handleCreateFolderConfirmed(event: { title: string }) {
    const parentId = this.pendingCreateFolderParentId;
    this.isCreateFolderDialogOpen = false;

    this.folderService.createFolder(this.teamCode, this.itemType, event.title, parentId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  handleCreateFolderCancelled() {
    this.isCreateFolderDialogOpen = false;
  }

  handleRenameFolder(event: { folderId: number; title: string }) {
    this.folderService.renameFolder(this.teamCode, event.folderId, event.title)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
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
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  handleDeleteFolder(event: { folderId: number; mode: FolderDeleteMode }) {
    const deletedItemIds = event.mode === 'cascade' ? this.itemIdsWithin(event.folderId) : [];

    this.folderService.deleteFolder(this.teamCode, event.folderId, event.mode)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        deletedItemIds.forEach((itemId) => this.favoriteService.forgetItem(this.itemType, itemId));
        this.loadData();
      });
  }

  handleMoveItem(event: { itemId: number; folderId: number | null }) {
    if (this.isSearching) {
      return;
    }

    this.itemService.moveToFolder(this.teamCode, event.itemId, event.folderId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  handleDeleteItem(event: { itemId: number }) {
    this.itemService.delete(this.teamCode, event.itemId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.favoriteService.forgetItem(this.itemType, event.itemId);
        this.loadData();
      });
  }

  protected loadData() {
    const sequence = ++this.requestSequence;

    Promise.all([
      this.folderService.listFolders(this.teamCode, this.itemType),
      this.itemService.list(this.teamCode, this.searchQuery || undefined)
    ]).then(([foldersResponse, itemsResponse]) => {
      if (sequence !== this.requestSequence) {
        return;
      }
      this.isLoading = false;

      if (!foldersResponse.success) {
        this.alertMessage = errorPhrase(foldersResponse.code);
        return;
      }
      if (!itemsResponse.success) {
        this.alertMessage = errorPhrase(itemsResponse.code);
        return;
      }

      this.alertMessage = '';
      this.folders = foldersResponse.folders.map((folder) => ({
        id: folder.id,
        title: folder.title,
        parentId: folder.parentId,
      }));
      this.items = itemsResponse.items.map((item) => this.toTreeItem(item));
    });
  }

  private itemIdsWithin(folderId: number): number[] {
    const folderIds = new Set([folderId]);
    let added = true;

    while (added) {
      added = false;
      for (const folder of this.folders) {
        if (folder.parentId !== null && folderIds.has(folder.parentId) && !folderIds.has(folder.id)) {
          folderIds.add(folder.id);
          added = true;
        }
      }
    }

    return this.items
      .filter((item) => item.folderId !== null && folderIds.has(item.folderId))
      .map((item) => item.id);
  }

  private toTreeItem(item: FolderedItemSummary): TreeItem {
    return {
      id: item.id,
      title: item.title,
      folderId: item.folderId,
      meta: {
        creator: {nickname: item.creator.nickname},
        updatedAt: item.updatedAt,
      },
    };
  }
}
