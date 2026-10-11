import {BoardService} from "@services/board.service";
import {TeamService} from "@services/team.service";
import {BoardPageStateService} from "./board-page-state.service";
import {boardDetail, createBoardState, ticketSummary} from "../../../testing/boardFixtures";

describe('BoardPageStateService', () => {
  it('loads the board and remembers an error code on failure', async () => {
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    const boardService = jasmine.createSpyObj<BoardService>('BoardService', ['getBoard']);
    boardService.getBoard.and.returnValues(
      Promise.resolve({success: true, board: boardDetail()}),
      Promise.resolve({success: false, code: 'BOARD_NOT_FOUND'}),
    );
    const state = new BoardPageStateService(boardService, teamService);

    await state.load(9);
    expect(state.board?.id).toBe(9);
    expect(state.errorCode).toBeNull();

    await state.reload();
    expect(boardService.getBoard).toHaveBeenCalledWith('abc', 9);
    expect(state.board).toBeNull();
    expect(state.errorCode).toBe('BOARD_NOT_FOUND');
  });

  it('places a ticket into its column or the backlog at its position', () => {
    const state = createBoardState();

    state.placeTicket(ticketSummary(1, null, 2));
    state.placeTicket(ticketSummary(3, 11, 0));

    expect(state.board!.columns[0].tickets.map((ticket) => ticket.id)).toEqual([2]);
    expect(state.board!.columns[1].tickets.map((ticket) => ticket.id)).toEqual([3]);
    expect(state.board!.backlog.map((ticket) => ticket.id)).toEqual([4, 1]);
  });

  it('finds, updates and removes tickets anywhere on the board', () => {
    const state = createBoardState();

    state.updateTicket({...ticketSummary(4, null, 1), title: 'Renamed'});
    state.removeTicket(1);

    expect(state.findTicket(4)?.title).toBe('Renamed');
    expect(state.findTicket(1)).toBeNull();
  });
});
