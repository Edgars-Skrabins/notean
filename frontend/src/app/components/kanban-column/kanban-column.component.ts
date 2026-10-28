import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {CdkDrag, CdkDragDrop, CdkDropList} from '@angular/cdk/drag-drop';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TITLE_MAX_LENGTH} from '@config/contentLimits';
import {BoardColumn} from '@models/board.model';
import {TicketSummary} from '@models/ticket.model';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {ButtonComponent} from '@components/button/button.component';
import {KanbanTicketComponent} from '@components/kanban-ticket/kanban-ticket.component';
import {Tag} from '@models/tag.model';

@Component({
  selector: 'app-kanban-column',
  imports: [
    NgFor,
    NgIf,
    FormsModule,
    TranslatePipe,
    IconButtonComponent,
    ButtonComponent,
    KanbanTicketComponent,
    CdkDropList,
    CdkDrag
  ],
  templateUrl: './kanban-column.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './kanban-column.component.css'
})
export class KanbanColumnComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;

  @Input({required: true}) column!: BoardColumn;
  @Input() tags: Tag[] = [];
  @Output() renameColumn = new EventEmitter<{ title: string }>();
  @Output() deleteColumn = new EventEmitter<void>();
  @Output() openTicket = new EventEmitter<TicketSummary>();
  @Output() moveTicketToBacklog = new EventEmitter<TicketSummary>();
  @Output() deleteTicket = new EventEmitter<TicketSummary>();
  @Output() addTicket = new EventEmitter<void>();
  @Output() ticketDropped = new EventEmitter<CdkDragDrop<TicketSummary[]>>();

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
