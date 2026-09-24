import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {DatePipe, NgFor, NgIf, NgTemplateOutlet} from '@angular/common';
import {CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup} from '@angular/cdk/drag-drop';
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
    CdkDropListGroup,
    CdkDropList,
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
  readonly rootDropTarget: DropTarget = {kind: 'root'};

  private expandedFolderIds = new Set<number>();

  readonly dropPredicate = (drag: CdkDrag<DragNode>, drop: CdkDropList<DropTarget>): boolean => {
    return this.isValidDropTarget(drag.data, drop.data!);
  };

  readonly neverAcceptsDrop = (): boolean => false;

  ngOnChanges() {
    this.rootFolders = this.buildFolders(null);
    this.rootItems = this.itemsIn(null);
  }

  isExpanded(folderId: number): boolean {
    return this.expandedFolderIds.has(folderId);
  }

  toggleExpand(folderId: number) {
    if (this.expandedFolderIds.has(folderId)) {
      this.expandedFolderIds.delete(folderId);
    } else {
      this.expandedFolderIds.add(folderId);
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
  }

  handleDragEnded() {
    this.draggingNode = null;
  }

  handleDrop(event: CdkDragDrop<DropTarget, DropTarget, DragNode>) {
    if (event.previousContainer === event.container) {
      return;
    }

    const dragData = event.item.data;
    const dropData = event.container.data!;

    if (!this.isValidDropTarget(dragData, dropData)) {
      return;
    }

    const targetFolderId = dropData.kind === 'root' ? null : dropData.folder.id;

    if (dragData.kind === 'item') {
      this.moveItem.emit({itemId: dragData.item.id, folderId: targetFolderId});
    } else {
      this.moveFolder.emit({folderId: dragData.folder.id, parentId: targetFolderId});
    }
  }

  isDropZoneInvalid(target: DropTarget): boolean {
    return this.draggingNode !== null && !this.isValidDropTarget(this.draggingNode, target);
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
