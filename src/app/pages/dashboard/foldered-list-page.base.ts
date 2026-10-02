import {Directive, OnDestroy, OnInit} from '@angular/core';
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {FolderItemType} from "@models/folder.model";
import {TreeFolder, TreeItem} from "@components/item-tree/item-tree.component";

export interface FolderedItemSummary {
  id: number;
  title: string;
  folderId: number | null;
  creator: { username: string };
  updatedAt: string;
}

type ServiceResult = { success: true } | { success: false; statusMessage: string };

@Directive()
export abstract class FolderedListPageComponent implements OnInit, OnDestroy {
  protected abstract readonly itemType: FolderItemType;

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
    private folderService: FolderService,
    private teamService: TeamService
  ) {
    this.teamCode = this.teamService.getCurrentTeam()!.code;
  }

  protected abstract listItems(search?: string): Promise<
    | { success: true; items: FolderedItemSummary[] }
    | { success: false; statusMessage: string }
  >;

  protected abstract moveItemToFolder(itemId: number, folderId: number | null): Promise<ServiceResult>;

  protected abstract deleteItemById(itemId: number): Promise<ServiceResult>;

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
          this.alertMessage = response.statusMessage;
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

  handleMoveItem(event: { itemId: number; folderId: number | null }) {
    if (this.isSearching) {
      return;
    }

    this.moveItemToFolder(event.itemId, event.folderId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  handleDeleteItem(event: { itemId: number }) {
    this.deleteItemById(event.itemId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  protected loadData() {
    const sequence = ++this.requestSequence;

    Promise.all([
      this.folderService.listFolders(this.teamCode, this.itemType),
      this.listItems(this.searchQuery || undefined)
    ]).then(([foldersResponse, itemsResponse]) => {
      if (sequence !== this.requestSequence) {
        return;
      }
      this.isLoading = false;

      if (!foldersResponse.success) {
        this.alertMessage = foldersResponse.statusMessage;
        return;
      }
      if (!itemsResponse.success) {
        this.alertMessage = itemsResponse.statusMessage;
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

  private toTreeItem(item: FolderedItemSummary): TreeItem {
    return {
      id: item.id,
      title: item.title,
      folderId: item.folderId,
      meta: {
        creator: {username: item.creator.username},
        updatedAt: item.updatedAt,
      },
    };
  }
}
