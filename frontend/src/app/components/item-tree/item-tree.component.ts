import {Component, EventEmitter, Input, OnChanges, Output, ChangeDetectionStrategy} from '@angular/core';
import {DatePipe, NgFor, NgIf, NgTemplateOutlet} from '@angular/common';
import {CdkDrag, CdkDragEnd, CdkDragMove} from '@angular/cdk/drag-drop';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {IconName} from '@components/icon/icon.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {DeleteFolderDialogComponent} from '@components/delete-folder-dialog/delete-folder-dialog.component';
import {ConfirmDialogComponent} from '@components/confirm-dialog/confirm-dialog.component';
import {FavoriteStarComponent} from '@components/favorite-star/favorite-star.component';
import {LoadMoreComponent} from '@components/load-more/load-more.component';
import {ItemTreeRowComponent} from '@components/item-tree-row/item-tree-row.component';
import {MenuButtonComponent} from '@components/menu-button/menu-button.component';
import {MenuButtonOption} from '@models/menu-button.model';
import {FolderDeleteMode} from "@models/folder.model";
import {compareByTitle} from '@utils/titleOrder';

export interface TreeFolder {
  id: number;
  title: string;
  parentId: number | null;
  projectId: number | null;
}

export interface TreeItem {
  id: number;
  title: string;
  folderId: number | null;
  projectId: number | null;
  lockVersion: number;
  meta: {
    creator: { nickname: string };
    updatedAt: string;
  };
}

export type ItemLevel = number | 'root';

export interface ItemLevelState {
  loaded: boolean;
  isLoading: boolean;
  hasMore: boolean;
}

interface BuiltFolder extends TreeFolder {
  children: BuiltFolder[];
  items: TreeItem[];
}

type DragNode =
  | { kind: 'folder'; folder: TreeFolder }
  | { kind: 'item'; item: TreeItem };

type DropTarget =
  | { kind: 'folder'; folder: TreeFolder }
  | { kind: 'root' };

@Component({
  selector: 'app-item-tree',
  imports: [
    NgFor,
    NgIf,
    NgTemplateOutlet,
    DatePipe,
    TranslatePipe,
    IconButtonComponent,
    DeleteFolderDialogComponent,
    ConfirmDialogComponent,
    FavoriteStarComponent,
    LoadMoreComponent,
    ItemTreeRowComponent,
    MenuButtonComponent,
    CdkDrag
  ],
  templateUrl: './item-tree.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './item-tree.component.css'
})
export class ItemTreeComponent implements OnChanges {
  protected readonly PHRASES = PHRASES;
  protected readonly createOptions: MenuButtonOption[] = [
    {value: 'blank', labelKey: PHRASES.BLANK},
    {value: 'template', labelKey: PHRASES.FROM_TEMPLATE},
  ];

  @Input() folders: TreeFolder[] = [];
  @Input() items: TreeItem[] = [];
  @Input() itemLabel = '';
  @Input({required: true}) itemIcon!: IconName;
  @Input({required: true}) favoritableType!: 'Page' | 'Diagram';
  @Input({required: true}) deleteItemConfirmMessage!: string;
  @Input() canChangeFolderProject = false;
  @Input() levels: ReadonlyMap<ItemLevel, ItemLevelState> = new Map();

  @Output() openItem = new EventEmitter<TreeItem>();
  @Output() createFolder = new EventEmitter<{ parentId: number | null }>();
  @Output() createItem = new EventEmitter<{ parentId: number | null; fromTemplate: boolean }>();
  @Output() deleteFolder = new EventEmitter<{ folderId: number; mode: FolderDeleteMode }>();
  @Output() deleteItem = new EventEmitter<{ itemId: number }>();
  @Output() renameFolder = new EventEmitter<{ folderId: number; title: string }>();
  @Output() renameItem = new EventEmitter<{ itemId: number; title: string }>();
  @Output() moveItem = new EventEmitter<{ itemId: number; folderId: number | null }>();
  @Output() moveFolder = new EventEmitter<{ folderId: number; parentId: number | null }>();
  @Output() changeFolderProject = new EventEmitter<{ folderId: number }>();
  @Output() expandFolder = new EventEmitter<{ folderId: number }>();
  @Output() loadMore = new EventEmitter<{ level: ItemLevel }>();

  rootFolders: BuiltFolder[] = [];
  rootItems: TreeItem[] = [];
  folderPendingDeletion: TreeFolder | null = null;
  itemPendingDeletion: TreeItem | null = null;
  renamingFolderId: number | null = null;
  renameDraftTitle = '';
  renamingItemId: number | null = null;
  renameItemDraftTitle = '';
  draggingNode: DragNode | null = null;
  hoveredTarget: DropTarget | null = null;
  readonly rootTarget: DropTarget = {kind: 'root'};

  private expandedFolderIds = new Set<number>();

  ngOnChanges() {
    this.rootFolders = this.buildFolders(null);
    this.rootItems = this.itemsIn(null);
  }

  isExpanded(folderId: number): boolean {
    return this.expandedFolderIds.has(folderId);
  }

  canExpand(folder: BuiltFolder): boolean {
    return folder.children.length > 0 || folder.items.length > 0 || !this.levels.get(folder.id)?.loaded;
  }

  levelState(level: ItemLevel): ItemLevelState | undefined {
    return this.levels.get(level);
  }

  handleCreateChoice(parentId: number, choice: string | number | null) {
    this.createItem.emit({parentId, fromTemplate: choice === 'template'});
  }

  toggleExpand(folder: BuiltFolder) {
    if (!this.canExpand(folder)) {
      return;
    }

    if (this.expandedFolderIds.has(folder.id)) {
      this.expandedFolderIds.delete(folder.id);
    } else {
      this.expandedFolderIds.add(folder.id);
      this.expandFolder.emit({folderId: folder.id});
    }
  }

  handleFolderRowClick(event: MouseEvent, folder: BuiltFolder) {
    if (event.target === event.currentTarget && this.renamingFolderId !== folder.id) {
      this.toggleExpand(folder);
    }
  }

  handleItemRowClick(event: MouseEvent, item: TreeItem) {
    if (event.target === event.currentTarget && this.renamingItemId !== item.id) {
      this.openItem.emit(item);
    }
  }

  requestDeleteFolder(folder: TreeFolder) {
    this.folderPendingDeletion = folder;
  }

  handleDeleteConfirmed(event: { mode: FolderDeleteMode }) {
    if (!this.folderPendingDeletion) {
      return;
    }

    this.deleteFolder.emit({folderId: this.folderPendingDeletion.id, mode: event.mode});
    this.folderPendingDeletion = null;
  }

  handleDeleteCancelled() {
    this.folderPendingDeletion = null;
  }

  requestDeleteItem(item: TreeItem) {
    this.itemPendingDeletion = item;
  }

  handleDeleteItemConfirmed() {
    if (!this.itemPendingDeletion) {
      return;
    }

    this.deleteItem.emit({itemId: this.itemPendingDeletion.id});
    this.itemPendingDeletion = null;
  }

  handleDeleteItemCancelled() {
    this.itemPendingDeletion = null;
  }

  startRenameFolder(folder: TreeFolder) {
    this.renamingFolderId = folder.id;
    this.renameDraftTitle = folder.title;
  }

  commitRenameFolder(folder: TreeFolder) {
    if (this.renamingFolderId !== folder.id) {
      return;
    }

    const title = this.renameDraftTitle.trim();
    this.renamingFolderId = null;

    if (title && title !== folder.title) {
      this.renameFolder.emit({folderId: folder.id, title});
    }
  }

  cancelRenameFolder() {
    this.renamingFolderId = null;
  }

  startRenameItem(item: TreeItem) {
    this.renamingItemId = item.id;
    this.renameItemDraftTitle = item.title;
  }

  commitRenameItem(item: TreeItem) {
    if (this.renamingItemId !== item.id) {
      return;
    }

    const title = this.renameItemDraftTitle.trim();
    this.renamingItemId = null;

    if (title && title !== item.title) {
      this.renameItem.emit({itemId: item.id, title});
    }
  }

  cancelRenameItem() {
    this.renamingItemId = null;
  }

  handleDragStarted(node: DragNode) {
    this.draggingNode = node;
    this.hoveredTarget = null;
  }

  handleDragMoved(event: CdkDragMove<DragNode>) {
    const target = this.resolveDropTarget(event.pointerPosition.x, event.pointerPosition.y);
    this.hoveredTarget = target && this.isValidDropTarget(event.source.data, target) ? target : null;
  }

  handleDragEnded(event: CdkDragEnd<DragNode>) {
    const dragData = event.source.data;
    const target = this.resolveDropTarget(event.dropPoint.x, event.dropPoint.y);

    this.draggingNode = null;
    this.hoveredTarget = null;
    event.source.reset();

    if (!target || !this.isValidDropTarget(dragData, target)) {
      return;
    }

    const targetFolderId = target.kind === 'root' ? null : target.folder.id;
    const currentFolderId = dragData.kind === 'item' ? dragData.item.folderId : dragData.folder.parentId;

    if (currentFolderId === targetFolderId) {
      return;
    }

    if (dragData.kind === 'item') {
      this.moveItem.emit({itemId: dragData.item.id, folderId: targetFolderId});
    } else {
      this.moveFolder.emit({folderId: dragData.folder.id, parentId: targetFolderId});
    }
  }

  isDropZoneInvalid(target: DropTarget): boolean {
    return this.draggingNode !== null && !this.isValidDropTarget(this.draggingNode, target);
  }

  isHovered(target: DropTarget): boolean {
    if (!this.hoveredTarget) {
      return false;
    }

    if (target.kind === 'root') {
      return this.hoveredTarget.kind === 'root';
    }

    return this.hoveredTarget.kind === 'folder' && this.hoveredTarget.folder.id === target.folder.id;
  }

  toFolderDrag(folder: TreeFolder): DragNode {
    return {kind: 'folder', folder};
  }

  toItemDrag(item: TreeItem): DragNode {
    return {kind: 'item', item};
  }

  toFolderDrop(folder: TreeFolder): DropTarget {
    return {kind: 'folder', folder};
  }

  private resolveDropTarget(x: number, y: number): DropTarget | null {
    const el = document.elementFromPoint(x, y);
    if (!el) {
      return null;
    }

    if (el.closest('[data-drop-root]')) {
      return {kind: 'root'};
    }

    const folderZone = el.closest<HTMLElement>('[data-drop-folder-id]');
    if (folderZone) {
      const folderId = Number(folderZone.dataset['dropFolderId']);
      const folder = this.folders.find((f) => f.id === folderId);
      if (folder) {
        return {kind: 'folder', folder};
      }
    }

    return null;
  }

  private isValidDropTarget(drag: DragNode, target: DropTarget): boolean {
    if (drag.kind === 'item') {
      return true;
    }

    if (target.kind === 'root') {
      return true;
    }

    if (target.folder.id === drag.folder.id) {
      return false;
    }

    return !this.folderDescendantIds(drag.folder.id).has(target.folder.id);
  }

  private folderDescendantIds(folderId: number): Set<number> {
    const result = new Set<number>();
    const stack = [folderId];

    while (stack.length) {
      const current = stack.pop()!;
      for (const folder of this.folders) {
        if (folder.parentId === current && !result.has(folder.id)) {
          result.add(folder.id);
          stack.push(folder.id);
        }
      }
    }

    return result;
  }

  private buildFolders(parentId: number | null): BuiltFolder[] {
    return this.folders
      .filter((folder) => folder.parentId === parentId)
      .map((folder) => ({
        ...folder,
        children: this.buildFolders(folder.id),
        items: this.itemsIn(folder.id),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  private itemsIn(folderId: number | null): TreeItem[] {
    return this.items
      .filter((item) => item.folderId === folderId)
      .sort(compareByTitle);
  }
}
