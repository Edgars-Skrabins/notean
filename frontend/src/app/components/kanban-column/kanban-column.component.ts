import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {CdkDrag, CdkDragDrop, CdkDropList} from '@angular/cdk/drag-drop';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {BoardColumn} from '@models/board.model';
import {CardSummary} from '@models/card.model';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {ButtonComponent} from '@components/button/button.component';
import {KanbanCardComponent} from '@components/kanban-card/kanban-card.component';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    FormsModule,
    TranslateModule,
    IconButtonComponent,
    ButtonComponent,
    KanbanCardComponent,
    CdkDropList,
    CdkDrag
  ],
  templateUrl: './kanban-column.component.html',
  styleUrl: './kanban-column.component.css'
})
export class KanbanColumnComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) column!: BoardColumn;
  @Output() renameColumn = new EventEmitter<{ title: string }>();
  @Output() deleteColumn = new EventEmitter<void>();
  @Output() openCard = new EventEmitter<CardSummary>();
  @Output() deleteCard = new EventEmitter<CardSummary>();
  @Output() addCard = new EventEmitter<void>();
  @Output() cardDropped = new EventEmitter<CdkDragDrop<CardSummary[]>>();

  isRenaming = false;
  renameDraft = '';

  startRename() {
    this.isRenaming = true;
    this.renameDraft = this.column.title;
  }

  commitRename() {
    if (!this.isRenaming) {
      return;
    }

    const title = this.renameDraft.trim();
    this.isRenaming = false;

    if (!title || title === this.column.title) {
      return;
    }

    this.renameColumn.emit({title});
  }

  cancelRename() {
    this.isRenaming = false;
  }
}
