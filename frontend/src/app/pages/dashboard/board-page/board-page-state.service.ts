import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {BoardService} from "@services/board.service";
import {TeamService} from "@services/team.service";
import {BoardColumn, BoardDetail, BoardSummary} from "@models/board.model";
import {TicketChange, TicketShift, TicketStatus, TicketStatusGroup, TicketSummary} from "@models/ticket.model";
import {BoardPriority} from "@models/priority.model";
import {Tag} from "@models/tag.model";
import {ErrorCode} from "@config/errorCodes";
import {PHRASES} from "@config/phrases";
import {shiftedPosition} from "@utils/ticketShifts";

@Injectable()
export class BoardPageStateService {
  board: BoardDetail | null = null;
  boardId = 0;
  errorCode: ErrorCode | null = null;

  readonly remoteChanges$ = new Subject<Map<number, string>>();
  readonly ticketChanges$ = new Subject<TicketChange>();
  readonly ticketShifts$ = new Subject<TicketShift[]>();
  readonly boardLoaded$ = new Subject<void>();

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
    this.boardLoaded$.next();
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

  setTags(tags: Tag[]) {
    if (!this.board) {
      return;
    }
    this.board.tags = tags;
    const ids = new Set(tags.map((tag) => tag.id));
    this.ticketsByStatus().forEach((group) => group.tickets.forEach((ticket) => {
      ticket.tagIds = ticket.tagIds.filter((id) => ids.has(id));
    }));
  }

  tagById(id: number): Tag | null {
    return this.board?.tags.find((tag) => tag.id === id) ?? null;
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
    this.dropTickets(moved.map((ticket) => ticket.id));
    [...moved]
      .sort((first, second) => first.position - second.position)
      .forEach((ticket) => this.ticketList(ticket.columnId)?.push({...ticket}));
    this.ticketChanges$.next({upserted: tickets, removedIds: []});
  }

  applyShifts(shifts: TicketShift[]) {
    if (!this.board) {
      return;
    }
    this.ticketsByStatus().forEach((group) => {
      group.tickets.forEach((ticket) => {
        ticket.position = shiftedPosition(ticket.position, group.status.columnId, shifts);
      });
      group.tickets.sort((first, second) => first.position - second.position);
    });
    this.ticketShifts$.next(shifts);
  }

  removeTickets(ticketIds: number[]) {
    if (!this.board) {
      return;
    }
    this.dropTickets(ticketIds);
    this.ticketChanges$.next({upserted: [], removedIds: ticketIds});
  }

  findTicket(ticketId: number): TicketSummary | null {
    if (!this.board) {
      return null;
    }
    const lists = [this.board.backlog, ...this.board.columns.map((column) => column.tickets)];
    return lists.flat().find((ticket) => ticket.id === ticketId) ?? null;
  }

  removeTicket(ticketId: number) {
    this.removeTickets([ticketId]);
  }

  placeTicket(ticket: TicketSummary) {
    if (!this.board) {
      return;
    }
    this.dropTickets([ticket.id]);
    const summary: TicketSummary = {
      id: ticket.id,
      title: ticket.title,
      position: ticket.position,
      columnId: ticket.columnId,
      priorityId: ticket.priorityId,
      lockVersion: ticket.lockVersion,
      assignees: ticket.assignees,
      tagIds: ticket.tagIds,
      attachmentCount: ticket.attachmentCount,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
    const column = this.board.columns.find((item) => item.id === ticket.columnId);
    const list = column ? column.tickets : this.board.backlog;
    list.splice(Math.min(summary.position, list.length), 0, summary);
    this.ticketChanges$.next({upserted: [summary], removedIds: []});
  }

  updateTicket(updated: TicketSummary) {
    const ticket = this.findTicket(updated.id);
    if (ticket) {
      ticket.title = updated.title;
      ticket.priorityId = updated.priorityId;
      ticket.lockVersion = updated.lockVersion;
      ticket.assignees = updated.assignees;
      ticket.tagIds = updated.tagIds;
      ticket.attachmentCount = updated.attachmentCount;
      ticket.updatedAt = updated.updatedAt;
      this.ticketChanges$.next({upserted: [{...ticket}], removedIds: []});
    }
  }

  setAttachmentCount(ticketId: number, count: number) {
    const ticket = this.findTicket(ticketId);
    if (ticket) {
      ticket.attachmentCount = count;
      this.ticketChanges$.next({upserted: [{...ticket}], removedIds: []});
    }
  }

  private dropTickets(ticketIds: number[]) {
    const ids = new Set(ticketIds);
    this.board!.backlog = this.board!.backlog.filter((ticket) => !ids.has(ticket.id));
    this.board!.columns.forEach((column) => {
      column.tickets = column.tickets.filter((ticket) => !ids.has(ticket.id));
    });
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
