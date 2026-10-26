import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {debounceTime, distinctUntilChanged, map, Subject, Subscription} from 'rxjs';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {TITLE_MAX_LENGTH} from "@config/contentLimits";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {TeamService} from "@services/team.service";
import {ProjectService} from "@services/project.service";
import {ToastType} from "@models/toast.model";
import {BulkTicketAction, TicketChange, TicketFilters, TicketStatus, TicketSummary} from "@models/ticket.model";
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
import {LoadMoreComponent} from "@components/load-more/load-more.component";
import {errorPhrase} from "@utils/errorPhrase";
import {assignableMembers} from "@utils/assignableMembers";
import {AppRoutes} from "../../../app/app-routes.enum";
import {BoardPageStateService} from "../board-page/board-page-state.service";

interface GroupData {
  tickets: TicketSummary[];
  hasMore: boolean;
  isLoading: boolean;
  loaded: boolean;
  extraIds: Set<number>;
}

interface ListGroup {
  status: TicketStatus;
  tickets: TicketSummary[];
  hasMore: boolean;
  isLoading: boolean;
  loaded: boolean;
}

function byPosition(first: TicketSummary, second: TicketSummary): number {
  return first.position - second.position;
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
    TicketSelectionBarComponent,
    LoadMoreComponent
  ],
  templateUrl: './list-tab.component.html',
  styleUrl: './list-tab.component.css'
})
export class ListTabComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;

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
  activeSearch = '';

  private groupData = new Map<number | null, GroupData>();
  private loadGeneration = 0;
  private searchTerms = new Subject<string>();
  private subscriptions: Subscription[] = [];

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
    this.reloadGroups();
    this.subscriptions = [
      this.state.ticketChanges$.subscribe((change) => this.applyTicketChange(change)),
      this.state.boardLoaded$.subscribe(() => this.reloadGroups()),
      this.searchTerms
        .pipe(map((query) => query.trim()), debounceTime(300), distinctUntilChanged())
        .subscribe((term) => {
          this.activeSearch = term;
          this.reloadGroups();
        }),
    ];
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  get groups(): ListGroup[] {
    return this.requestedStatuses().map((status) => {
      const data = this.dataFor(status.columnId);
      return {status, tickets: data.tickets, hasMore: data.hasMore, isLoading: data.isLoading, loaded: data.loaded};
    });
  }

  get showNoTickets(): boolean {
    return !this.isFiltering && this.groups.every((group) => group.loaded && !group.tickets.length);
  }

  get isFiltering(): boolean {
    return this.activeSearch.length > 0 || this.filters.assigneeIds.size > 0;
  }

  get selectedTickets(): TicketSummary[] {
    return this.groups
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
    this.reloadGroups();
  }

  handleSearchChange(query: string) {
    this.searchTerms.next(query);
  }

  handleLoadMore(group: ListGroup) {
    const data = this.dataFor(group.status.columnId);
    if (data.isLoading) {
      return;
    }

    data.isLoading = true;
    this.loadGroupPage(group.status.columnId, this.loadGeneration);
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
    return group.tickets.length > 0 && group.tickets.every((ticket) => this.selectedIds.has(ticket.id));
  }

  setGroupSelected(group: ListGroup, selected: boolean) {
    group.tickets.forEach((ticket) => this.setSelected(ticket, selected));
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
        this.insertOwnTicket(response.ticket);
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
    const ticket = tickets[event.previousIndex];
    const to = tickets[event.currentIndex].position;
    moveItemInArray(tickets, event.previousIndex, event.currentIndex);

    const columnId = group.status.columnId;
    const request = columnId === null
      ? this.ticketService.reorderBacklog(this.state.teamCode, this.state.boardId, ticket.id, to)
      : this.ticketService.moveTicket(this.state.teamCode, this.state.boardId, ticket.id, {columnId, position: to});

    request.then((response) => {
      if (!response.success) {
        moveItemInArray(tickets, event.currentIndex, event.previousIndex);
        this.toastService.show({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
        return;
      }

      this.state.placeTicket(response.ticket);
      this.syncPositions(columnId);
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

  private requestedStatuses(): TicketStatus[] {
    return this.state.statuses.filter((status) => !this.filters.columnIds.size || this.filters.columnIds.has(status.columnId));
  }

  private dataFor(columnId: number | null): GroupData {
    let data = this.groupData.get(columnId);
    if (!data) {
      data = {tickets: [], hasMore: false, isLoading: false, loaded: true, extraIds: new Set()};
      this.groupData.set(columnId, data);
    }
    return data;
  }

  private reloadGroups() {
    const generation = ++this.loadGeneration;
    this.groupData = new Map();
    this.clearSelection();
    this.requestedStatuses().forEach((status) => {
      this.groupData.set(status.columnId, {tickets: [], hasMore: false, isLoading: true, loaded: false, extraIds: new Set()});
      this.loadGroupPage(status.columnId, generation);
    });
  }

  private loadGroupPage(columnId: number | null, generation: number) {
    const data = this.dataFor(columnId);
    this.ticketService.list(this.state.teamCode, this.state.boardId, {
      status: columnId ?? 'backlog',
      search: this.activeSearch,
      assigneeIds: [...this.filters.assigneeIds],
      offset: data.tickets.length - data.extraIds.size,
    }).then((response) => {
      if (generation !== this.loadGeneration) {
        return;
      }
      data.isLoading = false;
      if (!response.success) {
        this.alertMessage = errorPhrase(response.code);
        return;
      }

      this.alertMessage = '';
      const loadedIds = new Set(response.tickets.map((ticket) => ticket.id));
      loadedIds.forEach((id) => data.extraIds.delete(id));
      data.tickets = [...data.tickets.filter((ticket) => !loadedIds.has(ticket.id)), ...response.tickets].sort(byPosition);
      data.hasMore = response.hasMore;
      data.loaded = true;
    });
  }

  private applyTicketChange(change: TicketChange) {
    const removedIds = new Set(change.removedIds);
    change.upserted.forEach((ticket) => removedIds.delete(ticket.id));
    this.groupData.forEach((data) => this.dropFrom(data, removedIds));
    removedIds.forEach((id) => this.selectedIds.delete(id));

    change.upserted.forEach((ticket) => {
      const current = [...this.groupData.entries()].find(([, data]) => data.tickets.some((item) => item.id === ticket.id));
      if (current && current[0] === ticket.columnId) {
        const data = current[1];
        data.tickets = data.tickets.map((item) => item.id === ticket.id ? {...ticket} : item);
        return;
      }
      if (current) {
        this.dropFrom(current[1], new Set([ticket.id]));
      }

      const target = this.groupData.get(ticket.columnId);
      if (target && this.isInLoadedRange(target, ticket)) {
        target.tickets = [...target.tickets, {...ticket}];
      }
    });
    this.groupData.forEach((data) => data.tickets.sort(byPosition));
  }

  private isInLoadedRange(data: GroupData, ticket: TicketSummary): boolean {
    if (this.isFiltering || !data.loaded) {
      return false;
    }
    if (!data.hasMore) {
      return true;
    }

    const loadedPositions = data.tickets.filter((item) => !data.extraIds.has(item.id)).map((item) => item.position);
    return loadedPositions.length > 0 && ticket.position <= Math.max(...loadedPositions);
  }

  private dropFrom(data: GroupData, ids: Set<number>) {
    data.tickets = data.tickets.filter((ticket) => !ids.has(ticket.id));
    ids.forEach((id) => data.extraIds.delete(id));
  }

  private insertOwnTicket(ticket: TicketSummary) {
    const data = this.groupData.get(ticket.columnId);
    if (!data || data.tickets.some((item) => item.id === ticket.id)) {
      return;
    }

    data.tickets = [...data.tickets, {...ticket}].sort(byPosition);
    if (data.hasMore) {
      data.extraIds.add(ticket.id);
    }
  }

  private syncPositions(columnId: number | null) {
    const full = this.state.ticketsByStatus().find((group) => group.status.columnId === columnId)?.tickets ?? [];
    const positions = new Map(full.map((ticket, index) => [ticket.id, index]));
    const data = this.dataFor(columnId);
    data.tickets.forEach((ticket) => ticket.position = positions.get(ticket.id) ?? ticket.position);
    data.tickets.sort(byPosition);
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
