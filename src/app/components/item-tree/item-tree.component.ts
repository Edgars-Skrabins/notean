import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {DatePipe, NgFor, NgIf, NgTemplateOutlet} from '@angular/common';
import {CdkDrag, CdkDragEnd, CdkDragMove} from '@angular/cdk/drag-drop';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {IconComponent} from '@components/icon/icon.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {DeleteFolderDialogComponent} from '@components/delete-folder-dialog/delete-folder-dialog.component';

export interface TreeFolder {
  id: number;
  title: string;
  parentId: number | null;
}

export interface TreeItem {
  id: number;
  title: string;
  folderId: number | null;
  meta: {
    creator: { username: string };
    updatedAt: string;
  };
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
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgTemplateOutlet,
    DatePipe,
    TranslateModule,
    IconComponent,
    IconButtonComponent,
    DeleteFolderDialogComponent,
    CdkDrag
  ],
  templateUrl: './item-tree.component.html',
  styleUrl: './item-tree.component.css'
})
export class ItemTreeComponent implements OnChanges {
  protected readonly PHRASES = PHRASES;

  @Input() folders: TreeFolder[] = [];
  @Input() items: TreeItem[] = [];
  @Input() itemLabel = '';

  @Output() openItem = new EventEmitter<TreeItem>();
  @Output() createFolder = new EventEmitter<{ parentId: number | null }>();
  @Output() createItem = new EventEmitter<{ parentId: number | null }>();
  @Output() deleteFolder = new EventEmitter<{ folderId: number; mode: 'cascade' | 'promote' }>();
  @Output() moveItem = new EventEmitter<{ itemId: number; folderId: number | null }>();
  @Output() moveFolder = new EventEmitter<{ folderId: number; parentId: number | null }>();

  rootFolders: BuiltFolder[] = [];
  rootItems: TreeItem[] = [];
  folderPendingDeletion: TreeFolder | null = null;
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

  hasContents(folder: BuiltFolder): boolean {
    return folder.children.length > 0 || folder.items.length > 0;
  }

  toggleExpand(folder: BuiltFolder) {
    if (!this.hasContents(folder)) {
      return;
    }

    if (this.expandedFolderIds.has(folder.id)) {
      this.expandedFolderIds.delete(folder.id);
    } else {
      this.expandedFolderIds.add(folder.id);
    }
  }

  requestDeleteFolder(folder: TreeFolder) {
    this.folderPendingDeletion = folder;
  }

  handleDeleteConfirmed(event: { mode: 'cascade' | 'promote' }) {
    if (!this.folderPendingDeletion) {
      return;
    }

    this.deleteFolder.emit({folderId: this.folderPendingDeletion.id, mode: event.mode});
    this.folderPendingDeletion = null;
  }

  handleDeleteCancelled() {
    this.folderPendingDeletion = null;
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
      .sort((a, b) => a.title.localeCompare(b.title));
  }
}
