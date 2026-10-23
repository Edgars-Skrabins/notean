import {Directive, OnDestroy, OnInit} from '@angular/core';
import {skip, Subscription} from 'rxjs';
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {FavoriteService} from "@services/favorite.service";
import {FolderDeleteMode, FolderItemType, FolderSummary} from "@models/folder.model";
import {TreeFolder, TreeItem} from "@components/item-tree/item-tree.component";
import {errorPhrase} from "@utils/errorPhrase";
import {itemIdsWithin, promoteFolderContents, removeFolderCascade} from "@utils/folderTree";
import {Router} from "@angular/router";
import {TranslateService} from "@ngx-translate/core";
import {ErrorCode} from "@config/errorCodes";
import {FolderedItemSummary} from "@models/foldered-item.model";
import {FolderedItemService} from "@services/foldered-item.service";
import {ProjectFilterService} from "@services/project-filter.service";
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
  private projectSubscription: Subscription | null = null;

  protected constructor(
    private itemService: FolderedItemService<ErrorCode>,
    private folderService: FolderService,
    private teamService: TeamService,
    private favoriteService: FavoriteService,
    private router: Router,
    private translateService: TranslateService,
    private projectFilterService: ProjectFilterService
  ) {
    this.teamCode = this.teamService.getCurrentTeamCode();
  }

  handleOpenItem(item: TreeItem) {
    this.router.navigate([AppRoutes.DASHBOARD, this.itemRoute, item.id]);
  }

  handleCreateItem(parentId: number | null) {
    const untitledTitle = this.translateService.instant(this.untitledItemPhrase);

    this.itemService.create(this.teamCode, untitledTitle, this.projectFilterService.getSelectedProjectId())
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

    const query = this.searchQuery.trim().toLowerCase();
    return this.items
      .filter((item) => item.title.toLowerCase().includes(query))
      .map((item) => ({...item, folderId: null}));
  }

  ngOnInit() {
    this.loadData();
    this.projectSubscription = this.projectFilterService.selectedProjectId$.pipe(skip(1)).subscribe(() => this.loadData());
  }

  ngOnDestroy() {
    this.projectSubscription?.unsubscribe();
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
        this.folders = [...this.folders, this.toTreeFolder(response.folder)];
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
        this.replaceFolder(this.toTreeFolder(response.folder));
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
        this.replaceFolder(this.toTreeFolder(response.folder));
      });
  }

  handleDeleteFolder(event: { folderId: number; mode: FolderDeleteMode }) {
    const deletedItemIds = event.mode === 'cascade' ? itemIdsWithin(this.folders, this.items, event.folderId) : [];

    this.folderService.deleteFolder(this.teamCode, event.folderId, event.mode)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        deletedItemIds.forEach((itemId) => this.favoriteService.forgetItem(this.itemType, itemId));
        const updated = event.mode === 'cascade'
          ? removeFolderCascade(this.folders, this.items, event.folderId)
          : promoteFolderContents(this.folders, this.items, event.folderId);
        this.folders = updated.folders;
        this.items = updated.items;
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
        const moved = this.toTreeItem(response.item);
        this.items = this.items.map((item) => item.id === moved.id ? moved : item);
      });
  }

  handleRenameItem(event: { itemId: number; title: string }) {
    this.itemService.rename(this.teamCode, event.itemId, event.title)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        const renamed = this.toTreeItem(response.item);
        this.items = this.items.map((item) => item.id === renamed.id ? renamed : item);
        this.favoriteService.renameItem(this.itemType, renamed.id, renamed.title);
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
        this.items = this.items.filter((item) => item.id !== event.itemId);
      });
  }

  private loadData() {
    const projectId = this.projectFilterService.getSelectedProjectId();
    Promise.all([
      this.folderService.listFolders(this.teamCode, this.itemType, projectId),
      this.itemService.list(this.teamCode, projectId)
    ]).then(([foldersResponse, itemsResponse]) => {
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
      this.folders = foldersResponse.folders.map((folder) => this.toTreeFolder(folder));
      this.items = itemsResponse.items.map((item) => this.toTreeItem(item));
    });
  }

  private replaceFolder(updated: TreeFolder) {
    this.folders = this.folders.map((folder) => folder.id === updated.id ? updated : folder);
  }

  private toTreeFolder(folder: FolderSummary): TreeFolder {
    return {
      id: folder.id,
      title: folder.title,
      parentId: folder.parentId,
    };
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
