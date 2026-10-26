import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {BoardService} from "@services/board.service";
import {TeamService} from "@services/team.service";
import {BoardColumn, BoardDetail, BoardSummary} from "@models/board.model";
import {TicketStatus, TicketStatusGroup, TicketSummary} from "@models/ticket.model";
import {BoardPriority} from "@models/priority.model";
import {ErrorCode} from "@config/errorCodes";
import {PHRASES} from "@config/phrases";

@Injectable()
export class BoardPageStateService {
  board: BoardDetail | null = null;
  boardId = 0;
  errorCode: ErrorCode | null = null;

  readonly remoteChanges$ = new Subject<Map<number, string>>();

  readonly teamCode: string;

  constructor(
    private boardService: BoardService,
    teamService: TeamService
  ) {
    this.teamCode = teamService.getCurrentTeamCode();
  }

  async load(boardId: number) {
    this.boardId = boardId;
    const response = await this.boardService.getBoard(this.teamCode, boardId);
    this.board = response.success ? response.board : null;
    this.errorCode = response.success ? null : response.code;
  }

  reload() {
    return this.load(this.boardId);
  }

  setColumns(columns: BoardColumn[]) {
    if (!this.board) {
      return;
    }
    const existing = new Map(this.board.columns.map((column) => [column.id, column]));
    this.board.columns = columns.map((column) => ({
      ...column,
      tickets: existing.get(column.id)?.tickets ?? column.tickets,
    }));
  }

  setBoardMeta(meta: Pick<BoardSummary, 'id' | 'title' | 'projectId'>) {
    if (!this.board || this.board.id !== meta.id) {
      return;
    }
    this.board.title = meta.title;
    this.board.projectId = meta.projectId;
  }

  setPriorities(priorities: BoardPriority[]) {
    if (!this.board) {
      return;
    }
    this.board.priorities = priorities;
    const ids = new Set(priorities.map((priority) => priority.id));
    this.ticketsByStatus().forEach((group) => group.tickets.forEach((ticket) => {
      if (ticket.priorityId !== null && !ids.has(ticket.priorityId)) {
        ticket.priorityId = null;
      }
    }));
  }

  priorityById(id: number | null): BoardPriority | null {
    if (id === null || !this.board) {
      return null;
    }
    return this.board.priorities.find((priority) => priority.id === id) ?? null;
  }

  get statuses(): TicketStatus[] {
    if (!this.board) {
      return [];
    }
    return [
      {columnId: null, title: PHRASES.BACKLOG},
      ...this.board.columns.map((column) => ({columnId: column.id, title: column.title})),
    ];
  }

  ticketsByStatus(): TicketStatusGroup[] {
    return this.statuses.map((status) => ({status, tickets: this.ticketList(status.columnId) ?? []}));
  }

  applyTickets(tickets: TicketSummary[]) {
    if (!this.board) {
      return;
    }
    const moved: TicketSummary[] = [];
    tickets.forEach((ticket) => {
      const list = this.ticketList(ticket.columnId);
      const index = list ? list.findIndex((item) => item.id === ticket.id) : -1;
      if (list && index >= 0) {
        list[index] = {...ticket};
      } else {
        moved.push(ticket);
      }
    });
    this.removeTickets(moved.map((ticket) => ticket.id));
    [...moved]
      .sort((first, second) => first.position - second.position)
      .forEach((ticket) => this.ticketList(ticket.columnId)?.push({...ticket}));
  }

  removeTickets(ticketIds: number[]) {
    if (!this.board) {
      return;
    }
    const ids = new Set(ticketIds);
    this.board.backlog = this.board.backlog.filter((ticket) => !ids.has(ticket.id));
    this.board.columns.forEach((column) => {
      column.tickets = column.tickets.filter((ticket) => !ids.has(ticket.id));
    });
  }

  findTicket(ticketId: number): TicketSummary | null {
    if (!this.board) {
      return null;
    }
    const lists = [this.board.backlog, ...this.board.columns.map((column) => column.tickets)];
    return lists.flat().find((ticket) => ticket.id === ticketId) ?? null;
  }

  removeTicket(ticketId: number) {
    if (!this.board) {
      return;
    }
    this.board.backlog = this.board.backlog.filter((ticket) => ticket.id !== ticketId);
    this.board.columns.forEach((column) => {
      column.tickets = column.tickets.filter((ticket) => ticket.id !== ticketId);
    });
  }

  placeTicket(ticket: TicketSummary) {
    if (!this.board) {
      return;
    }
    this.removeTicket(ticket.id);
    const summary: TicketSummary = {
      id: ticket.id,
      title: ticket.title,
      position: ticket.position,
      columnId: ticket.columnId,
      priorityId: ticket.priorityId,
      assignees: ticket.assignees,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
    const column = this.board.columns.find((item) => item.id === ticket.columnId);
    const list = column ? column.tickets : this.board.backlog;
    list.splice(Math.min(summary.position, list.length), 0, summary);
  }

  updateTicket(updated: TicketSummary) {
    const ticket = this.findTicket(updated.id);
    if (ticket) {
      ticket.title = updated.title;
      ticket.priorityId = updated.priorityId;
      ticket.assignees = updated.assignees;
      ticket.updatedAt = updated.updatedAt;
    }
  }

  private ticketList(columnId: number | null): TicketSummary[] | null {
    if (!this.board) {
      return null;
    }
    if (columnId === null) {
      return this.board.backlog;
    }
    return this.board.columns.find((column) => column.id === columnId)?.tickets ?? null;
  }
}
