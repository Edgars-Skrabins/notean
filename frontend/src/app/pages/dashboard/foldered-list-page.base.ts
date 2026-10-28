import {Directive, OnDestroy, OnInit} from '@angular/core';
import {debounceTime, distinctUntilChanged, map, skip, Subject, Subscription} from 'rxjs';
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {FavoriteService} from "@services/favorite.service";
import {TrashService} from "@services/trash.service";
import {FolderDeleteMode, FolderItemType, FolderSummary} from "@models/folder.model";
import {ItemLevel, ItemLevelState, TreeFolder, TreeItem} from "@components/item-tree/item-tree.component";
import {errorPhrase} from "@utils/errorPhrase";
import {itemIdsWithin, promoteFolderContents, removeFolderCascade, setFolderSubtreeProject} from "@utils/folderTree";
import {compareByTitle, TitledItem} from "@utils/titleOrder";
import {Router} from "@angular/router";
import {ErrorCode} from "@config/errorCodes";
import {FolderedItemSummary} from "@models/foldered-item.model";
import {FolderedItemService} from "@services/foldered-item.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {PHRASES} from "@config/phrases";
import {MenuButtonOption} from "@models/menu-button.model";
import {TemplateKind} from "@models/template.model";
import {createFromTemplateRoute} from "@utils/templateRoute";
import {AppRoutes} from "../../app/app-routes.enum";

@Directive()
export abstract class FolderedListPageComponent implements OnInit, OnDestroy {
  protected abstract readonly itemType: FolderItemType;
  protected abstract readonly itemRoute: AppRoutes;
  protected abstract readonly templateKind: Exclude<TemplateKind, 'board'>;
  protected readonly createOptions: MenuButtonOption[] = [
    {value: 'blank', labelKey: PHRASES.BLANK},
    {value: 'template', labelKey: PHRASES.FROM_TEMPLATE},
  ];

  folders: TreeFolder[] = [];
  items: TreeItem[] = [];
  levels: ReadonlyMap<ItemLevel, ItemLevelState> = new Map();
  searchQuery = '';
  activeSearch = '';
  searchItems: TreeItem[] = [];
  searchLevels: ReadonlyMap<ItemLevel, ItemLevelState> = new Map();
  isLoading = true;
  alertMessage = '';
  isCreateFolderDialogOpen = false;
  isTemplatePickerOpen = false;
  folderPendingProjectChange: TreeFolder | null = null;

  protected readonly teamCode: string;
  private pendingCreateFolderParentId: number | null = null;
  private templatePickerFolderId: number | null = null;
  private projectSubscription: Subscription | null = null;
  private levelBoundaries = new Map<ItemLevel, TitledItem>();
  private loadGeneration = 0;
  private createdItem: FolderedItemSummary | null;
  private searchDisplayItems: TreeItem[] = [];
  private searchGeneration = 0;
  private searchTerms = new Subject<string>();
  private searchSubscription: Subscription | null = null;
  private restoredSubscription: Subscription | null = null;

  protected constructor(
    private itemService: FolderedItemService<ErrorCode>,
    private folderService: FolderService,
    private teamService: TeamService,
    private favoriteService: FavoriteService,
    private router: Router,
    protected projectFilterService: ProjectFilterService,
    private trashService: TrashService
  ) {
    this.teamCode = this.teamService.getCurrentTeamCode();
    this.createdItem = this.router.getCurrentNavigation()?.extras.state?.['createdItem'] ?? null;
  }

  handleOpenItem(item: TreeItem) {
    this.router.navigate([AppRoutes.DASHBOARD, this.itemRoute, item.id]);
  }

  handleCreateItem(parentId: number | null, fromTemplate = false) {
    if (fromTemplate) {
      this.templatePickerFolderId = parentId;
      this.isTemplatePickerOpen = true;
      return;
    }

    const queryParams = parentId !== null ? {folder: parentId} : {};
    this.router.navigate([AppRoutes.DASHBOARD, this.itemRoute, AppRoutes.NEW], {queryParams});
  }

  handleCreateChoice(choice: string | number | null) {
    this.handleCreateItem(null, choice === 'template');
  }

  handleTemplatePicked(ref: string) {
    this.isTemplatePickerOpen = false;
    const {commands, queryParams} = createFromTemplateRoute(this.templateKind, ref, this.templatePickerFolderId);
    this.router.navigate(commands, {queryParams});
  }

  handleTemplatePickerCancelled() {
    this.isTemplatePickerOpen = false;
  }

  get isSearching(): boolean {
    return this.activeSearch.length > 0;
  }

  get displayFolders(): TreeFolder[] {
    return this.isSearching ? [] : this.folders;
  }

  get displayItems(): TreeItem[] {
    return this.isSearching ? this.searchDisplayItems : this.items;
  }

  get displayLevels(): ReadonlyMap<ItemLevel, ItemLevelState> {
    return this.isSearching ? this.searchLevels : this.levels;
  }

  get hasNoSearchResults(): boolean {
    const state = this.searchLevels.get('root');
    return this.isSearching && !!state?.loaded && !state.isLoading && !this.searchItems.length;
  }

  ngOnInit() {
    this.loadData();
    this.projectSubscription = this.projectFilterService.selectedProjectId$.pipe(skip(1)).subscribe(() => {
      this.loadData();
      this.startSearch(this.activeSearch);
    });
    this.searchSubscription = this.searchTerms
      .pipe(map((query) => query.trim()), debounceTime(300), distinctUntilChanged())
      .subscribe((term) => this.startSearch(term));
    this.restoredSubscription = this.trashService.restored$.subscribe((restored) => {
      if (restored.some((item) => item.itemType === this.itemType || item.itemType === 'Folder')) {
        this.loadData();
        this.startSearch(this.activeSearch);
      }
    });
  }

  ngOnDestroy() {
    this.projectSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
    this.restoredSubscription?.unsubscribe();
  }

  handleSearchChange(query: string) {
    this.searchTerms.next(query);
  }

  handleExpandFolder(event: { folderId: number }) {
    if (!this.levels.get(event.folderId)?.loaded) {
      this.loadLevel(event.folderId);
    }
  }

  handleLoadMore(event: { level: ItemLevel }) {
    if (this.isSearching) {
      this.loadSearchPage();
      return;
    }

    this.loadLevel(event.level);
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
        this.trashService.notifyTrashed(this.teamCode, response.trashEntryIds);
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
    const item = [...this.items, ...this.searchItems].find((candidate) => candidate.id === event.itemId);
    if (!item) {
      return;
    }

    this.itemService.rename(this.teamCode, event.itemId, event.title, item.lockVersion)
      .then((response) => {
        if ('latest' in response) {
          this.alertMessage = errorPhrase(response.code);
          const latest = this.toTreeItem(response.latest);
          this.replaceItem(latest);
          this.favoriteService.renameItem(this.itemType, latest.id, latest.title);
          return;
        }

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        const renamed = this.toTreeItem(response.item);
        this.replaceItem(renamed);
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
        this.trashService.notifyTrashed(this.teamCode, response.trashEntryIds);
        this.items = this.items.filter((item) => item.id !== event.itemId);
        this.setSearchItems(this.searchItems.filter((item) => item.id !== event.itemId));
      });
  }

  private loadData() {
    const projectId = this.projectFilterService.getSelectedProjectId();
    const generation = ++this.loadGeneration;
    this.levels = new Map();
    this.levelBoundaries.clear();
    Promise.all([
      this.folderService.listFolders(this.teamCode, this.itemType, projectId),
      this.itemService.list(this.teamCode, {folderId: 'root', projectId})
    ]).then(([foldersResponse, itemsResponse]) => {
      if (generation !== this.loadGeneration) {
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
      this.folders = foldersResponse.folders.map((folder) => this.toTreeFolder(folder));
      this.items = [];
      this.applyLevelPage('root', itemsResponse.items, itemsResponse.hasMore);
      this.insertCreatedItem(projectId);
    });
  }

  private loadLevel(level: ItemLevel) {
    const state = this.levels.get(level);
    if (state?.isLoading) {
      return;
    }

    const generation = this.loadGeneration;
    const projectId = this.projectFilterService.getSelectedProjectId();
    this.setLevel(level, {loaded: state?.loaded ?? false, isLoading: true, hasMore: state?.hasMore ?? false});
    this.itemService.list(this.teamCode, {folderId: level, projectId, offset: this.loadedOffset(level)})
      .then((response) => {
        if (generation !== this.loadGeneration) {
          return;
        }
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          this.setLevel(level, {...this.levels.get(level)!, isLoading: false});
          return;
        }

        this.alertMessage = '';
        this.applyLevelPage(level, response.items, response.hasMore);
      });
  }

  private applyLevelPage(level: ItemLevel, page: FolderedItemSummary[], hasMore: boolean) {
    const loadedIds = new Set(page.map((item) => item.id));
    this.items = [...this.items.filter((item) => !loadedIds.has(item.id)), ...page.map((item) => this.toTreeItem(item))];
    if (page.length) {
      const last = page[page.length - 1];
      this.levelBoundaries.set(level, {id: last.id, title: last.title});
    }
    this.setLevel(level, {loaded: true, isLoading: false, hasMore});
  }

  private loadedOffset(level: ItemLevel): number {
    const boundary = this.levelBoundaries.get(level);
    if (!boundary) {
      return 0;
    }

    const folderId = level === 'root' ? null : level;
    return this.items.filter((item) => item.folderId === folderId && compareByTitle(item, boundary) <= 0).length;
  }

  private setLevel(level: ItemLevel, state: ItemLevelState) {
    this.levels = new Map(this.levels).set(level, state);
  }

  private insertCreatedItem(projectId: number | null) {
    const created = this.createdItem;
    this.createdItem = null;
    if (!created || (projectId !== null && created.projectId !== projectId) || this.items.some((item) => item.id === created.id)) {
      return;
    }

    this.items = [...this.items, this.toTreeItem(created)];
  }

  private startSearch(term: string) {
    this.activeSearch = term;
    this.searchGeneration++;
    this.setSearchItems([]);
    this.searchLevels = new Map();
    if (term) {
      this.loadSearchPage();
    }
  }

  private loadSearchPage() {
    const state = this.searchLevels.get('root');
    if (state?.isLoading) {
      return;
    }

    const generation = ++this.searchGeneration;
    this.searchLevels = new Map([['root', {loaded: state?.loaded ?? false, isLoading: true, hasMore: state?.hasMore ?? false}]]);
    this.itemService.list(this.teamCode, {
      search: this.activeSearch,
      projectId: this.projectFilterService.getSelectedProjectId(),
      offset: this.searchItems.length,
    }).then((response) => {
      if (generation !== this.searchGeneration) {
        return;
      }
      if (!response.success) {
        this.alertMessage = errorPhrase(response.code);
        this.searchLevels = new Map([['root', {...this.searchLevels.get('root')!, isLoading: false}]]);
        return;
      }

      this.alertMessage = '';
      const loadedIds = new Set(response.items.map((item) => item.id));
      this.setSearchItems([...this.searchItems.filter((item) => !loadedIds.has(item.id)), ...response.items.map((item) => this.toTreeItem(item))]);
      this.searchLevels = new Map([['root', {loaded: true, isLoading: false, hasMore: response.hasMore}]]);
    });
  }

  private setSearchItems(items: TreeItem[]) {
    this.searchItems = items;
    this.searchDisplayItems = items.map((item) => ({...item, folderId: null}));
  }

  private replaceItem(updated: TreeItem) {
    this.items = this.items.map((item) => item.id === updated.id ? updated : item);
    this.setSearchItems(this.searchItems.map((item) => item.id === updated.id ? updated : item));
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
      lockVersion: item.lockVersion,
      meta: {
        creator: {nickname: item.creator.nickname},
        updatedAt: item.updatedAt,
      },
    };
  }
}
