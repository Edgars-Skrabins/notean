import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {CdkScrollable} from '@angular/cdk/scrolling';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {TITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH} from "@config/contentLimits";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {TeamService} from "@services/team.service";
import {ProjectService} from "@services/project.service";
import {assignableMembers} from "@utils/assignableMembers";
import {AuthService} from "@services/auth.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {TicketDetail, TicketResponse} from "@models/ticket.model";
import {TeamMember} from "@models/team.model";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {ButtonComponent} from "@components/button/button.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {EditConflictDialogComponent} from "@components/edit-conflict-dialog/edit-conflict-dialog.component";
import {FavoriteStarComponent} from "@components/favorite-star/favorite-star.component";
import {MoveToBoardDialogComponent} from "@components/move-to-board-dialog/move-to-board-dialog.component";
import {TicketAssigneesComponent} from "@components/ticket-assignees/ticket-assignees.component";
import {DropdownComponent} from "@components/dropdown/dropdown.component";
import {DropdownOption} from "@models/dropdown.model";
import {errorPhrase} from "@utils/errorPhrase";
import {BoardPageStateService} from "../board-page/board-page-state.service";
import {EscapeService} from "@services/escape.service";

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    CdkScrollable,
    TranslateModule,
    IconButtonComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EditConflictDialogComponent,
    FavoriteStarComponent,
    MoveToBoardDialogComponent,
    TicketAssigneesComponent,
    DropdownComponent
  ],
  templateUrl: './ticket-detail.component.html',
  styleUrl: './ticket-detail.component.css'
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;
  protected readonly DESCRIPTION_MAX_LENGTH = DESCRIPTION_MAX_LENGTH;

  ticket: TicketDetail | null = null;
  titleDraft = '';
  descriptionDraft = '';
  isLoading = true;
  alertMessage = '';
  showDeleteConfirm = false;
  editConflict: { changes: { title: string } | { description: string }; latest: TicketDetail } | null = null;
  isMoveDialogOpen = false;
  members: TeamMember[] = [];
  isUpdatingAssignees = false;
  readonly currentUserId: number;

  private ticketId = 0;

  private unregisterEscape = () => {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    protected state: BoardPageStateService,
    private ticketService: TicketService,
    private favoriteService: FavoriteService,
    private toastService: ToastService,
    private teamService: TeamService,
    private projectService: ProjectService,
    authService: AuthService,
    private escapeService: EscapeService
  ) {
    this.currentUserId = authService.getCurrentUser()?.id ?? 0;
  }

  private get teamCode(): string {
    return this.state.teamCode;
  }

  private get boardId(): number {
    return this.state.boardId;
  }

  get priorityOptions(): DropdownOption[] {
    return [
      {value: null, labelKey: PHRASES.NO_PRIORITY},
      ...(this.state.board?.priorities ?? []).map((priority) => ({value: priority.id, label: priority.name, color: priority.color})),
    ];
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleGoBack());
    this.ticketId = Number(this.route.snapshot.paramMap.get('ticketId'));
    this.loadTicket();
    this.loadAssignableMembers();
  }

  ngOnDestroy() {
    this.unregisterEscape();
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
    if (!this.ticket || this.editConflict) {
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

    this.saveText({title}, this.ticket.lockVersion);
  }

  cancelTitleEdit(event: Event) {
    if (this.ticket && !this.editConflict && this.titleDraft !== this.ticket.title) {
      this.titleDraft = this.ticket.title;
      event.preventDefault();
    }
  }

  commitDescription() {
    if (!this.ticket || this.editConflict) {
      return;
    }

    if (this.descriptionDraft === this.ticket.description) {
      return;
    }

    this.saveText({description: this.descriptionDraft}, this.ticket.lockVersion);
  }

  cancelDescriptionEdit(event: Event) {
    if (this.ticket && !this.editConflict && this.descriptionDraft !== this.ticket.description) {
      this.descriptionDraft = this.ticket.description;
      event.preventDefault();
    }
  }

  handleConflictLoadLatest() {
    if (!this.editConflict) {
      return;
    }

    const latest = this.editConflict.latest;
    this.editConflict = null;
    this.ticket = latest;
    this.titleDraft = latest.title;
    this.descriptionDraft = latest.description;
    this.favoriteService.renameItem('Ticket', latest.id, latest.title);
    this.state.updateTicket(latest);
  }

  handleConflictOverwrite() {
    if (!this.editConflict) {
      return;
    }

    const {changes, latest} = this.editConflict;
    this.editConflict = null;
    this.saveText(changes, latest.lockVersion);
  }

  handleConflictCancel() {
    this.editConflict = null;
  }

  handlePriorityChange(value: string | number | null) {
    const priorityId = value === null ? null : Number(value);
    this.ticketService.updateTicket(this.teamCode, this.boardId, this.ticketId, {priorityId})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.ticket = response.ticket;
        this.state.updateTicket(response.ticket);
      });
  }

  private saveText(changes: { title: string } | { description: string }, lockVersion: number) {
    this.ticketService.updateTicket(this.teamCode, this.boardId, this.ticketId, {...changes, lockVersion})
      .then((response) => {
        if ('latest' in response) {
          this.editConflict = {changes, latest: response.latest};
          return;
        }

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.ticket = response.ticket;
        if ('description' in changes) {
          this.descriptionDraft = response.ticket.description;
          return;
        }

        this.titleDraft = response.ticket.title;
        this.favoriteService.renameItem('Ticket', response.ticket.id, response.ticket.title);
        this.state.updateTicket(response.ticket);
      });
  }

  private loadAssignableMembers() {
    const projectId = this.state.board?.projectId ?? null;
    Promise.all([
      this.teamService.fetchTeamMembers(this.teamCode),
      projectId === null ? Promise.resolve(null) : this.projectService.getProject(this.teamCode, projectId),
    ]).then(([members, projectResponse]) => {
      const projectMemberIds = projectResponse?.success ? projectResponse.project.members.map((member) => member.id) : null;
      this.members = assignableMembers(members, projectId === null ? null : projectMemberIds ?? []);
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
