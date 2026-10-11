import {BoardService} from "@services/board.service";
import {TeamService} from "@services/team.service";
import {BoardDetail} from "@models/board.model";
import {TicketDetail, TicketSummary} from "@models/ticket.model";
import {BoardPageStateService} from "@pages/dashboard/board-page/board-page-state.service";

export const TEST_TEAM_CODE = 'abc';
export const TEST_BOARD_ID = 9;

export function ticketSummary(id: number, columnId: number | null, position = 0): TicketSummary {
  return {id, title: `Ticket ${id}`, position, columnId, updatedAt: '2026-10-01T00:00:00Z'};
}

export function ticketDetail(id: number, columnId: number | null, position = 0): TicketDetail {
  return {
    ...ticketSummary(id, columnId, position),
    description: 'Details',
    boardId: TEST_BOARD_ID,
    creator: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}},
    createdAt: '2026-10-01T00:00:00Z',
  };
}

export function boardDetail(): BoardDetail {
  return {
    id: TEST_BOARD_ID,
    title: 'Sprint 12',
    creator: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}},
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    columns: [
      {id: 10, title: 'To Do', position: 0, tickets: [ticketSummary(1, 10, 0), ticketSummary(2, 10, 1)]},
      {id: 11, title: 'Done', position: 1, tickets: []},
    ],
    backlog: [ticketSummary(3, null, 0), ticketSummary(4, null, 1)],
  };
}

export function createBoardState(board: BoardDetail = boardDetail()): BoardPageStateService {
  const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
  teamService.getCurrentTeamCode.and.returnValue(TEST_TEAM_CODE);
  const boardService = jasmine.createSpyObj<BoardService>('BoardService', ['getBoard']);
  boardService.getBoard.and.returnValue(Promise.resolve({success: true, board}));
  const state = new BoardPageStateService(boardService, teamService);
  state.board = board;
  state.boardId = board.id;
  return state;
}
