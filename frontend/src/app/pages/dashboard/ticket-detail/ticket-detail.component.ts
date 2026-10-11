import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {TicketDetail, TicketResponse} from "@models/ticket.model";
import {TeamMember} from "@models/team.model";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {ButtonComponent} from "@components/button/button.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {FavoriteStarComponent} from "@components/favorite-star/favorite-star.component";
import {MoveToBoardDialogComponent} from "@components/move-to-board-dialog/move-to-board-dialog.component";
import {TicketAssigneesComponent} from "@components/ticket-assignees/ticket-assignees.component";
import {errorPhrase} from "@utils/errorPhrase";
import {BoardPageStateService} from "../board-page/board-page-state.service";

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    IconButtonComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    FavoriteStarComponent,
    MoveToBoardDialogComponent,
    TicketAssigneesComponent
  ],
  templateUrl: './ticket-detail.component.html',
  styleUrl: './ticket-detail.component.css'
})
export class TicketDetailComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  ticket: TicketDetail | null = null;
  titleDraft = '';
  descriptionDraft = '';
  isLoading = true;
  alertMessage = '';
  showDeleteConfirm = false;
  isMoveDialogOpen = false;
  members: TeamMember[] = [];
  isUpdatingAssignees = false;
  readonly currentUserId: number;

  private ticketId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    protected state: BoardPageStateService,
    private ticketService: TicketService,
    private favoriteService: FavoriteService,
    private toastService: ToastService,
    private teamService: TeamService,
    authService: AuthService
  ) {
    this.currentUserId = authService.getCurrentUser()?.id ?? 0;
  }

  private get teamCode(): string {
    return this.state.teamCode;
  }

  private get boardId(): number {
    return this.state.boardId;
  }

  ngOnInit() {
    this.ticketId = Number(this.route.snapshot.paramMap.get('ticketId'));
    this.loadTicket();
    this.loadAssignableMembers();
  }

  handleAddAssignee(userId: number) {
    this.updateAssignees(this.ticketService.addAssignee(this.teamCode, this.boardId, this.ticketId, userId));
  }

  handleRemoveAssignee(userId: number) {
    this.updateAssignees(this.ticketService.removeAssignee(this.teamCode, this.boardId, this.ticketId, userId));
  }

  handleGoBack() {
    this.router.navigate(['../..'], {relativeTo: this.route});
  }

  handleMoveToBacklog() {
    this.ticketService.moveToBacklog(this.teamCode, this.boardId, this.ticketId)
      .then((response) => this.applyMove(response));
  }

  handleOpenMoveDialog() {
    this.isMoveDialogOpen = true;
  }

  handleMoveCancelled() {
    this.isMoveDialogOpen = false;
  }

  handleMoveToColumn(event: { columnId: number }) {
    this.isMoveDialogOpen = false;
    this.ticketService.moveTicket(this.teamCode, this.boardId, this.ticketId, {columnId: event.columnId})
      .then((response) => this.applyMove(response));
  }

  handleDelete() {
    this.showDeleteConfirm = true;
  }

  handleCancelDelete() {
    this.showDeleteConfirm = false;
  }

  handleConfirmDelete() {
    this.showDeleteConfirm = false;

    this.ticketService.deleteTicket(this.teamCode, this.boardId, this.ticketId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.favoriteService.forgetItem('Ticket', this.ticketId);
        this.state.removeTicket(this.ticketId);
        this.handleGoBack();
      });
  }

  commitTitle() {
    if (!this.ticket) {
      return;
    }

    const title = this.titleDraft.trim();

    if (!title) {
      this.titleDraft = this.ticket.title;
      return;
    }

    if (title === this.ticket.title) {
      return;
    }

    this.ticketService.updateTicket(this.teamCode, this.boardId, this.ticketId, {title})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.ticket = response.ticket;
        this.titleDraft = response.ticket.title;
        this.favoriteService.renameItem('Ticket', response.ticket.id, response.ticket.title);
        this.state.updateTicket(response.ticket);
      });
  }

  cancelTitleEdit() {
    if (this.ticket) {
      this.titleDraft = this.ticket.title;
    }
  }

  commitDescription() {
    if (!this.ticket) {
      return;
    }

    if (this.descriptionDraft === this.ticket.description) {
      return;
    }

    this.ticketService.updateTicket(this.teamCode, this.boardId, this.ticketId, {description: this.descriptionDraft})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.ticket = response.ticket;
        this.descriptionDraft = response.ticket.description;
      });
  }

  cancelDescriptionEdit() {
    if (this.ticket) {
      this.descriptionDraft = this.ticket.description;
    }
  }

  private loadAssignableMembers() {
    this.teamService.fetchTeamMembers(this.teamCode).then((members) => {
      this.members = members;
    });
  }

  private updateAssignees(request: Promise<TicketResponse>) {
    this.isUpdatingAssignees = true;

    request
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: PHRASES.ASSIGNEES_UPDATE_FAILED});
          return;
        }

        this.ticket = response.ticket;
        this.state.updateTicket(response.ticket);
      })
      .finally(() => {
        this.isUpdatingAssignees = false;
      });
  }

  private applyMove(response: TicketResponse) {
    if (!response.success) {
      this.toastService.show({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
      return;
    }

    this.ticket = response.ticket;
    this.state.placeTicket(response.ticket);
  }

  private loadTicket() {
    this.isLoading = true;

    this.ticketService.getTicket(this.teamCode, this.boardId, this.ticketId)
      .then((response) => {
        this.isLoading = false;

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.ticket = response.ticket;
        this.titleDraft = response.ticket.title;
        this.descriptionDraft = response.ticket.description;
      });
  }
}
