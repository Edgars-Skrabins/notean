import {Component} from '@angular/core';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {TicketSummary} from "@models/ticket.model";
import {BacklogRowComponent} from "@components/backlog-row/backlog-row.component";
import {MoveToBoardDialogComponent} from "@components/move-to-board-dialog/move-to-board-dialog.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {IconComponent} from "@components/icon/icon.component";
import {errorPhrase} from "@utils/errorPhrase";
import {AppRoutes} from "../../../app/app-routes.enum";
import {BoardPageStateService} from "../board-page/board-page-state.service";

@Component({
  selector: 'app-backlog-tab',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    RouterOutlet,
    TranslateModule,
    CdkDropList,
    CdkDrag,
    BacklogRowComponent,
    MoveToBoardDialogComponent,
    ConfirmDialogComponent,
    IconComponent
  ],
  templateUrl: './backlog-tab.component.html',
  styleUrl: './backlog-tab.component.css'
})
export class BacklogTabComponent {
  protected readonly PHRASES = PHRASES;

  alertMessage = '';
  isCreating = false;
  newTicketTitle = '';
  ticketToMove: TicketSummary | null = null;
  ticketPendingDeletion: TicketSummary | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    protected state: BoardPageStateService,
    private ticketService: TicketService,
    private favoriteService: FavoriteService,
    private toastService: ToastService
  ) {
  }

  get backlog(): TicketSummary[] {
    return this.state.board?.backlog ?? [];
  }

  handleOpenTicket(ticket: TicketSummary) {
    this.router.navigate([AppRoutes.TICKETS, ticket.id], {relativeTo: this.route});
  }

  handleStartCreate() {
    this.isCreating = true;
  }

  handleCreate() {
    const title = this.newTicketTitle.trim();
    if (!title) {
      return;
    }
    this.newTicketTitle = '';

    this.ticketService.createTicket(this.state.teamCode, this.state.boardId, title, null)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.state.placeTicket(response.ticket);
      });
  }

  handleCloseCreate() {
    if (!this.newTicketTitle.trim()) {
      this.isCreating = false;
      this.newTicketTitle = '';
    }
  }

  handleDropped(event: CdkDragDrop<TicketSummary[]>) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const backlog = this.backlog;
    const ticket = backlog[event.previousIndex];
    moveItemInArray(backlog, event.previousIndex, event.currentIndex);

    this.ticketService.reorderBacklog(this.state.teamCode, this.state.boardId, ticket.id, event.currentIndex)
      .then((response) => {
        if (!response.success) {
          moveItemInArray(backlog, event.currentIndex, event.previousIndex);
          this.toastService.show({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
        }
      });
  }

  handleMoveRequested(ticket: TicketSummary) {
    this.ticketToMove = ticket;
  }

  handleMoveCancelled() {
    this.ticketToMove = null;
  }

  handleMoveConfirmed(event: { columnId: number }) {
    const ticket = this.ticketToMove;
    this.ticketToMove = null;
    if (!ticket) {
      return;
    }

    this.ticketService.moveTicket(this.state.teamCode, this.state.boardId, ticket.id, {columnId: event.columnId})
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
          return;
        }

        this.state.placeTicket(response.ticket);
      });
  }

  requestDelete(ticket: TicketSummary) {
    this.ticketPendingDeletion = ticket;
  }

  handleCancelDelete() {
    this.ticketPendingDeletion = null;
  }

  handleConfirmDelete() {
    const ticket = this.ticketPendingDeletion;
    this.ticketPendingDeletion = null;
    if (!ticket) {
      return;
    }

    this.ticketService.deleteTicket(this.state.teamCode, this.state.boardId, ticket.id)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.favoriteService.forgetItem('Ticket', ticket.id);
        this.state.removeTicket(ticket.id);
      });
  }
}
