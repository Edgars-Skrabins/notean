import {Directive, OnDestroy, OnInit} from '@angular/core';
import {skip, Subscription} from 'rxjs';
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {FavoriteService} from "@services/favorite.service";
import {FolderDeleteMode, FolderItemType, FolderSummary} from "@models/folder.model";
import {TreeFolder, TreeItem} from "@components/item-tree/item-tree.component";
import {errorPhrase} from "@utils/errorPhrase";
import {itemIdsWithin, promoteFolderContents, removeFolderCascade, setFolderSubtreeProject} from "@utils/folderTree";
import {Router} from "@angular/router";
import {ErrorCode} from "@config/errorCodes";
import {FolderedItemSummary} from "@models/foldered-item.model";
import {FolderedItemService} from "@services/foldered-item.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {AppRoutes} from "../../app/app-routes.enum";

@Directive()
export abstract class FolderedListPageComponent implements OnInit, OnDestroy {
  protected abstract readonly itemType: FolderItemType;
  protected abstract readonly itemRoute: AppRoutes;

  folders: TreeFolder[] = [];
  items: TreeItem[] = [];
  searchQuery = '';
  isLoading = true;
  alertMessage = '';
  isCreateFolderDialogOpen = false;
  folderPendingProjectChange: TreeFolder | null = null;

  protected readonly teamCode: string;
  private pendingCreateFolderParentId: number | null = null;
  private projectSubscription: Subscription | null = null;

  protected constructor(
    private itemService: FolderedItemService<ErrorCode>,
    private folderService: FolderService,
    private teamService: TeamService,
    private favoriteService: FavoriteService,
    private router: Router,
    protected projectFilterService: ProjectFilterService
  ) {
    this.teamCode = this.teamService.getCurrentTeamCode();
  }

  handleOpenItem(item: TreeItem) {
    this.router.navigate([AppRoutes.DASHBOARD, this.itemRoute, item.id]);
  }

  handleCreateItem(parentId: number | null) {
    const queryParams = parentId !== null ? {folder: parentId} : {};
    this.router.navigate([AppRoutes.DASHBOARD, this.itemRoute, AppRoutes.NEW], {queryParams});
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

  get isCreatingTopLevelFolder(): boolean {
    return this.pendingCreateFolderParentId === null;
  }

  get defaultFolderProjectId(): number | null {
    return this.projectFilterService.getSelectedProjectId();
  }

  handleCreateFolderConfirmed(event: { title: string; projectId: number | null }) {
    const parentId = this.pendingCreateFolderParentId;
    this.isCreateFolderDialogOpen = false;

    this.folderService.createFolder(this.teamCode, this.itemType, event.title, parentId, event.projectId)
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

  handleChangeFolderProject(event: { folderId: number }) {
    this.folderPendingProjectChange = this.folders.find((folder) => folder.id === event.folderId) ?? null;
  }

  handleFolderProjectCancelled() {
    this.folderPendingProjectChange = null;
  }

  handleFolderProjectConfirmed(event: { projectId: number | null }) {
    const folder = this.folderPendingProjectChange;
    this.folderPendingProjectChange = null;
    if (!folder) {
      return;
    }

    this.folderService.setFolderProject(this.teamCode, folder.id, event.projectId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        const selectedProjectId = this.projectFilterService.getSelectedProjectId();
        const updated = selectedProjectId !== null && selectedProjectId !== response.folder.projectId
          ? removeFolderCascade(this.folders, this.items, folder.id)
          : setFolderSubtreeProject(this.folders, this.items, folder.id, response.folder.projectId);
        this.folders = updated.folders;
        this.items = updated.items;
      });
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
        const updated = setFolderSubtreeProject(this.folders, this.items, response.folder.id, response.folder.projectId);
        this.folders = updated.folders;
        this.items = updated.items;
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
      projectId: folder.projectId,
    };
  }

  private toTreeItem(item: FolderedItemSummary): TreeItem {
    return {
      id: item.id,
      title: item.title,
      folderId: item.folderId,
      projectId: item.projectId,
      meta: {
        creator: {nickname: item.creator.nickname},
        updatedAt: item.updatedAt,
      },
    };
  }
}
