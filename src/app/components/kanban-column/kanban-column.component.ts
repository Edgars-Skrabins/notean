import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {BoardColumn} from '@models/board.model';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [
    NgIf,
    FormsModule,
    TranslateModule,
    IconButtonComponent
  ],
  templateUrl: './kanban-column.component.html',
  styleUrl: './kanban-column.component.css'
})
export class KanbanColumnComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) column!: BoardColumn;
  @Output() renameColumn = new EventEmitter<{ title: string }>();
  @Output() deleteColumn = new EventEmitter<void>();

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
