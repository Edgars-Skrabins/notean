import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {TeamService} from "@services/team.service";
import {ProjectService} from "@services/project.service";
import {ToastType} from "@models/toast.model";
import {BulkTicketAction, TicketFilters, TicketStatus, TicketSummary} from "@models/ticket.model";
import {BoardUser} from "@models/board.model";
import {TeamMember} from "@models/team.model";
import {ListRowComponent} from "@components/list-row/list-row.component";
import {MoveToBoardDialogComponent} from "@components/move-to-board-dialog/move-to-board-dialog.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {IconComponent} from "@components/icon/icon.component";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {CheckboxComponent} from "@components/checkbox/checkbox.component";
import {TicketFilterComponent} from "@components/ticket-filter/ticket-filter.component";
import {TicketSelectionBarComponent} from "@components/ticket-selection-bar/ticket-selection-bar.component";
import {errorPhrase} from "@utils/errorPhrase";
import {assignableMembers} from "@utils/assignableMembers";
import {AppRoutes} from "../../../app/app-routes.enum";
import {BoardPageStateService} from "../board-page/board-page-state.service";

interface ListGroup {
  status: TicketStatus;
  tickets: TicketSummary[];
  visibleTickets: TicketSummary[];
}

@Component({
  selector: 'app-list-tab',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    RouterOutlet,
    TranslateModule,
    CdkDropList,
    CdkDrag,
    ListRowComponent,
    MoveToBoardDialogComponent,
    ConfirmDialogComponent,
    IconComponent,
    IconButtonComponent,
    CheckboxComponent,
    TicketFilterComponent,
    TicketSelectionBarComponent
  ],
  templateUrl: './list-tab.component.html',
  styleUrl: './list-tab.component.css'
})
export class ListTabComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  alertMessage = '';
  isCreating = false;
  newTicketTitle = '';
  ticketToMove: TicketSummary | null = null;
  ticketPendingDeletion: TicketSummary | null = null;
  members: TeamMember[] = [];
  searchQuery = '';
  filters: TicketFilters = {assigneeIds: new Set(), columnIds: new Set()};
  collapsedStatuses = new Set<number | null>();
  selectedIds = new Set<number>();
  isBulkBusy = false;
  isBulkDeleteConfirmOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    protected state: BoardPageStateService,
    private ticketService: TicketService,
    private favoriteService: FavoriteService,
    private toastService: ToastService,
    private teamService: TeamService,
    private projectService: ProjectService
  ) {
  }

  ngOnInit() {
    this.loadMembers();
  }

  get groups(): ListGroup[] {
    return this.state.ticketsByStatus()
      .filter((group) => !this.filters.columnIds.size || this.filters.columnIds.has(group.status.columnId))
      .map((group) => ({...group, visibleTickets: group.tickets.filter((ticket) => this.isVisible(ticket))}));
  }

  get hasTickets(): boolean {
    return this.state.ticketsByStatus().some((group) => group.tickets.length > 0);
  }

  get selectedTickets(): TicketSummary[] {
    return this.state.ticketsByStatus()
      .flatMap((group) => group.tickets)
      .filter((ticket) => this.selectedIds.has(ticket.id));
  }

  get assignedMembers(): BoardUser[] {
    const members = new Map<number, BoardUser>();
    this.selectedTickets.forEach((ticket) => ticket.assignees.forEach((assignee) => members.set(assignee.id, assignee)));
    return [...members.values()];
  }

  trackByTicket(_index: number, ticket: TicketSummary): number {
    return ticket.id;
  }

  trackByGroup(_index: number, group: ListGroup): number | null {
    return group.status.columnId;
  }

  isVisible(ticket: TicketSummary): boolean {
    const query = this.searchQuery.trim().toLowerCase();
    if (query && !ticket.title.toLowerCase().includes(query)) {
      return false;
    }
    const assigneeIds = this.filters.assigneeIds;
    if (!assigneeIds.size) {
      return true;
    }
    if (assigneeIds.has('none') && !ticket.assignees.length) {
      return true;
    }
    return ticket.assignees.some((assignee) => assigneeIds.has(assignee.id));
  }

  isCollapsed(status: TicketStatus): boolean {
    return this.collapsedStatuses.has(status.columnId);
  }

  toggleCollapsed(status: TicketStatus) {
    if (this.collapsedStatuses.has(status.columnId)) {
      this.collapsedStatuses.delete(status.columnId);
    } else {
      this.collapsedStatuses.add(status.columnId);
    }
  }

  handleFiltersChange(filters: TicketFilters) {
    this.filters = filters;
  }

  isSelected(ticket: TicketSummary): boolean {
    return this.selectedIds.has(ticket.id);
  }

  setSelected(ticket: TicketSummary, selected: boolean) {
    if (selected) {
      this.selectedIds.add(ticket.id);
    } else {
      this.selectedIds.delete(ticket.id);
    }
  }

  isGroupSelected(group: ListGroup): boolean {
    return group.visibleTickets.length > 0 && group.visibleTickets.every((ticket) => this.selectedIds.has(ticket.id));
  }

  setGroupSelected(group: ListGroup, selected: boolean) {
    group.visibleTickets.forEach((ticket) => this.setSelected(ticket, selected));
  }

  clearSelection() {
    this.selectedIds = new Set();
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

  handleDropped(group: ListGroup, event: CdkDragDrop<TicketSummary[]>) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const tickets = group.tickets;
    const ticket = group.visibleTickets[event.previousIndex];
    const from = tickets.indexOf(ticket);
    const to = tickets.indexOf(group.visibleTickets[event.currentIndex]);
    moveItemInArray(tickets, from, to);

    const columnId = group.status.columnId;
    const request = columnId === null
      ? this.ticketService.reorderBacklog(this.state.teamCode, this.state.boardId, ticket.id, to)
      : this.ticketService.moveTicket(this.state.teamCode, this.state.boardId, ticket.id, {columnId, position: to});

    request.then((response) => {
      if (!response.success) {
        moveItemInArray(tickets, to, from);
        this.toastService.show({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
        return;
      }

      tickets.forEach((item, index) => item.position = index);
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
        this.selectedIds.delete(ticket.id);
        this.state.removeTicket(ticket.id);
      });
  }

  handleBulkStatus(columnId: number | null) {
    this.runBulkUpdate(columnId === null ? {toBacklog: true} : {columnId}, true);
  }

  handleBulkAssign(userId: number) {
    this.runBulkUpdate({addAssigneeId: userId}, false);
  }

  handleBulkUnassign(userId: number) {
    this.runBulkUpdate({removeAssigneeId: userId}, false);
  }

  requestBulkDelete() {
    this.isBulkDeleteConfirmOpen = true;
  }

  handleCancelBulkDelete() {
    this.isBulkDeleteConfirmOpen = false;
  }

  handleConfirmBulkDelete() {
    this.isBulkDeleteConfirmOpen = false;
    const ids = this.selectedTickets.map((ticket) => ticket.id);
    if (!ids.length) {
      return;
    }

    this.isBulkBusy = true;
    this.ticketService.bulkDelete(this.state.teamCode, this.state.boardId, ids)
      .then((response) => {
        this.isBulkBusy = false;
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: PHRASES.BULK_ACTION_FAILED});
          return;
        }

        ids.forEach((id) => this.favoriteService.forgetItem('Ticket', id));
        this.state.removeTickets(ids);
        this.clearSelection();
      });
  }

  private runBulkUpdate(action: BulkTicketAction, movesTickets: boolean) {
    const ids = this.selectedTickets.map((ticket) => ticket.id);
    if (!ids.length) {
      return;
    }

    this.isBulkBusy = true;
    this.ticketService.bulkUpdate(this.state.teamCode, this.state.boardId, ids, action)
      .then((response) => {
        this.isBulkBusy = false;
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: PHRASES.BULK_ACTION_FAILED});
          return;
        }

        if (movesTickets) {
          this.state.removeTickets(ids);
        }
        this.state.applyTickets(response.tickets);
        this.clearSelection();
      });
  }

  private loadMembers() {
    const projectId = this.state.board?.projectId ?? null;
    Promise.all([
      this.teamService.fetchTeamMembers(this.state.teamCode),
      projectId === null ? Promise.resolve(null) : this.projectService.getProject(this.state.teamCode, projectId),
    ]).then(([members, projectResponse]) => {
      const projectMemberIds = projectResponse?.success ? projectResponse.project.members.map((member) => member.id) : null;
      this.members = assignableMembers(members, projectId === null ? null : projectMemberIds ?? []);
    });
  }
}
