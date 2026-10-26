import {Injectable} from '@angular/core';
import {Subscription} from '@rails/actioncable';
import {CableService} from "@services/cable.service";
import {NavigationService} from "@services/navigation.service";
import {ToastService} from "@services/toast.service";
import {mapBoardColumn, mapTicketSummary, RawBoardColumn, RawTicketSummary} from "@services/board.service";
import {mapBoardPriority, RawBoardPriority} from "@services/priority.service";
import {ToastType} from "@models/toast.model";
import {PHRASES} from "@config/phrases";
import {AppRoutes} from "../app/app-routes.enum";
import {BoardPageStateService} from "@pages/dashboard/board-page/board-page-state.service";

interface RawRemoteTicket extends RawTicketSummary {
  description?: string;
}

export type BoardChannelMessage =
  | { type: 'tickets_upserted'; tickets: RawRemoteTicket[] }
  | { type: 'tickets_removed'; ticket_ids: number[] }
  | { type: 'columns_changed'; columns: RawBoardColumn[]; tickets?: RawTicketSummary[] }
  | { type: 'priorities_changed'; priorities: RawBoardPriority[]; tickets?: RawTicketSummary[] }
  | { type: 'board_updated'; board: { id: number; title: string; project_id: number | null } }
  | { type: 'board_deleted' }
  | { type: 'access_changed' };

@Injectable()
export class BoardChannelService {
  private subscription: Subscription | null = null;

  constructor(
    private cableService: CableService,
    private state: BoardPageStateService,
    private navigationService: NavigationService,
    private toastService: ToastService
  ) {
  }

  connect(boardId: number) {
    this.disconnect();

    this.subscription = this.cableService.subscribe(
      {channel: 'BoardChannel', board_id: boardId},
      {
        received: (data: BoardChannelMessage) => this.handleMessage(data),
      }
    );
  }

  async handleMessage(message: BoardChannelMessage) {
    switch (message.type) {
      case 'tickets_upserted':
        this.applyTickets(message.tickets);
        break;
      case 'tickets_removed':
        this.state.removeTickets(message.ticket_ids);
        this.state.remoteChanges$.next(new Map());
        break;
      case 'columns_changed':
        this.state.setColumns(message.columns.map(mapBoardColumn));
        this.applyTickets(message.tickets ?? []);
        break;
      case 'priorities_changed':
        this.state.setPriorities(message.priorities.map(mapBoardPriority));
        this.applyTickets(message.tickets ?? []);
        break;
      case 'board_updated':
        this.state.setBoardMeta({id: message.board.id, title: message.board.title, projectId: message.board.project_id});
        break;
      case 'board_deleted':
        this.leave(PHRASES.BOARD_WAS_DELETED);
        break;
      case 'access_changed':
        await this.state.reload();
        if (this.state.errorCode === 'BOARD_NOT_FOUND') {
          this.leave(PHRASES.BOARD_ACCESS_LOST);
        } else {
          this.state.remoteChanges$.next(new Map());
        }
        break;
    }
  }

  disconnect() {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }

  private applyTickets(rawTickets: RawRemoteTicket[]) {
    const tickets = rawTickets.map(mapTicketSummary);
    this.state.applyTickets(tickets);

    const columnIds = new Set(tickets.map((ticket) => ticket.columnId));
    this.state.ticketsByStatus()
      .filter((group) => columnIds.has(group.status.columnId))
      .forEach((group) => group.tickets.sort((first, second) => first.position - second.position));

    const descriptions = new Map<number, string>();
    rawTickets.forEach((ticket) => {
      if (ticket.description !== undefined) {
        descriptions.set(ticket.id, ticket.description);
      }
    });
    this.state.remoteChanges$.next(descriptions);
  }

  private leave(message: string) {
    this.disconnect();
    this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME);
    this.toastService.show({type: ToastType.INFO, message});
  }
}
