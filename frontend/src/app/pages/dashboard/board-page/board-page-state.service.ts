import {Injectable} from '@angular/core';
import {BoardService} from "@services/board.service";
import {TeamService} from "@services/team.service";
import {BoardDetail} from "@models/board.model";
import {TicketSummary} from "@models/ticket.model";
import {ErrorCode} from "@config/errorCodes";

@Injectable()
export class BoardPageStateService {
  board: BoardDetail | null = null;
  boardId = 0;
  errorCode: ErrorCode | null = null;

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
      assignees: ticket.assignees,
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
      ticket.assignees = updated.assignees;
      ticket.updatedAt = updated.updatedAt;
    }
  }
}
