import {Component} from '@angular/core';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {NgFor, NgIf} from '@angular/common';
import {CdkDragDrop, CdkDropListGroup, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {ColumnService} from "@services/column.service";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {BoardColumn} from "@models/board.model";
import {TicketSummary} from "@models/ticket.model";
import {ButtonComponent} from "@components/button/button.component";
import {KanbanColumnComponent} from "@components/kanban-column/kanban-column.component";
import {CreateNamedItemDialogComponent} from "@components/create-named-item-dialog/create-named-item-dialog.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {errorPhrase} from "@utils/errorPhrase";
import {AppRoutes} from "../../../app/app-routes.enum";
import {BoardPageStateService} from "../board-page/board-page-state.service";

@Component({
  selector: 'app-kanban-tab',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    RouterOutlet,
    TranslateModule,
    ButtonComponent,
    KanbanColumnComponent,
    CreateNamedItemDialogComponent,
    ConfirmDialogComponent,
    CdkDropListGroup
  ],
  templateUrl: './kanban-tab.component.html',
  styleUrl: './kanban-tab.component.css'
})
export class KanbanTabComponent {
  protected readonly PHRASES = PHRASES;

  alertMessage = '';
  columnPendingDeletion: BoardColumn | null = null;
  isCreateColumnDialogOpen = false;
  ticketPendingDeletion: { ticket: TicketSummary; column: BoardColumn } | null = null;
  addTicketToColumn: BoardColumn | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    protected state: BoardPageStateService,
    private columnService: ColumnService,
    private ticketService: TicketService,
    private favoriteService: FavoriteService,
    private toastService: ToastService
  ) {
  }

  handleRenameColumn(column: BoardColumn, title: string) {
    this.columnService.renameColumn(this.state.teamCode, this.state.boardId, column.id, title)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        column.title = response.column.title;
      });
  }

  requestDeleteColumn(column: BoardColumn) {
    this.columnPendingDeletion = column;
  }

  handleCancelDeleteColumn() {
    this.columnPendingDeletion = null;
  }

  handleConfirmDeleteColumn() {
    const column = this.columnPendingDeletion;
    this.columnPendingDeletion = null;
    if (!column) {
      return;
    }

    this.columnService.deleteColumn(this.state.teamCode, this.state.boardId, column.id)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        column.tickets.forEach((ticket) => this.favoriteService.forgetItem('Ticket', ticket.id));
        if (this.state.board) {
          this.state.board.columns = this.state.board.columns.filter((existing) => existing.id !== column.id);
        }
      });
  }

  handleAddColumn() {
    this.isCreateColumnDialogOpen = true;
  }

  handleCreateColumnConfirmed(event: { title: string }) {
    this.isCreateColumnDialogOpen = false;

    this.columnService.createColumn(this.state.teamCode, this.state.boardId, event.title)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.state.board?.columns.push(response.column);
      });
  }

  handleCreateColumnCancelled() {
    this.isCreateColumnDialogOpen = false;
  }

  handleOpenTicket(ticket: TicketSummary) {
    this.router.navigate([AppRoutes.TICKETS, ticket.id], {relativeTo: this.route});
  }

  handleMoveToBacklog(ticket: TicketSummary) {
    this.ticketService.moveToBacklog(this.state.teamCode, this.state.boardId, ticket.id)
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
          return;
        }

        this.state.placeTicket(response.ticket);
      });
  }

  requestDeleteTicket(ticket: TicketSummary, column: BoardColumn) {
    this.ticketPendingDeletion = {ticket, column};
  }

  handleCancelDeleteTicket() {
    this.ticketPendingDeletion = null;
  }

  handleConfirmDeleteTicket() {
    const pending = this.ticketPendingDeletion;
    this.ticketPendingDeletion = null;
    if (!pending) {
      return;
    }

    this.ticketService.deleteTicket(this.state.teamCode, this.state.boardId, pending.ticket.id)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.favoriteService.forgetItem('Ticket', pending.ticket.id);
        this.state.removeTicket(pending.ticket.id);
      });
  }

  handleAddTicket(column: BoardColumn) {
    this.addTicketToColumn = column;
  }

  handleCreateTicketConfirmed(event: { title: string }) {
    const column = this.addTicketToColumn;
    this.addTicketToColumn = null;
    if (!column) {
      return;
    }

    this.ticketService.createTicket(this.state.teamCode, this.state.boardId, event.title, column.id)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.state.placeTicket(response.ticket);
      });
  }

  handleCreateTicketCancelled() {
    this.addTicketToColumn = null;
  }

  handleTicketDropped(event: CdkDragDrop<TicketSummary[]>, column: BoardColumn) {
    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) {
        return;
      }
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }

    const ticket = event.container.data[event.currentIndex];
    ticket.columnId = column.id;

    this.ticketService.moveTicket(this.state.teamCode, this.state.boardId, ticket.id, {columnId: column.id, position: event.currentIndex})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          this.state.reload();
          return;
        }

        this.alertMessage = '';
      });
  }
}
