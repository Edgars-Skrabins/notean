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

  it('lists Backlog and then each column as statuses, with their tickets', () => {
    const state = createBoardState();

    expect(state.statuses).toEqual([
      {columnId: null, title: 'BACKLOG'},
      {columnId: 10, title: 'To Do'},
      {columnId: 11, title: 'Done'},
    ]);
    expect(state.ticketsByStatus().map((group) => group.tickets.map((ticket) => ticket.id))).toEqual([[3, 4], [1, 2], []]);
  });

  it('applies moved tickets to the end of their new group in position order', () => {
    const state = createBoardState();

    state.applyTickets([ticketSummary(4, 10, 3), ticketSummary(3, 10, 2)]);

    expect(state.board!.backlog.map((ticket) => ticket.id)).toEqual([]);
    expect(state.board!.columns[0].tickets.map((ticket) => ticket.id)).toEqual([1, 2, 3, 4]);
  });

  it('applies updated tickets in place within their group', () => {
    const state = createBoardState();
    const alice = {id: 1, nickname: 'alice', avatar: {color: 'red' as const, imageUrl: null}};

    state.applyTickets([{...ticketSummary(1, 10, 5), assignees: [alice]}]);

    expect(state.board!.columns[0].tickets.map((ticket) => ticket.id)).toEqual([1, 2]);
    expect(state.findTicket(1)?.assignees).toEqual([alice]);
  });

  it('removes several tickets from any group', () => {
    const state = createBoardState();

    state.removeTickets([2, 3]);

    expect(state.board!.columns[0].tickets.map((ticket) => ticket.id)).toEqual([1]);
    expect(state.board!.backlog.map((ticket) => ticket.id)).toEqual([4]);
  });

  it('finds a priority by id and returns null for none or an unknown id', () => {
    const state = createBoardState();

    expect(state.priorityById(21)?.name).toBe('High');
    expect(state.priorityById(null)).toBeNull();
    expect(state.priorityById(99)).toBeNull();
  });

  it('replaces the priorities and clears deleted ones from tickets', () => {
    const state = createBoardState();
    state.board!.backlog[0].priorityId = 21;
    state.board!.columns[0].tickets[0].priorityId = 20;

    state.setPriorities([{id: 20, name: 'Low', color: 'blue', position: 0, ticketCount: 1}]);

    expect(state.board!.priorities.map((priority) => priority.id)).toEqual([20]);
    expect(state.board!.backlog[0].priorityId).toBeNull();
    expect(state.board!.columns[0].tickets[0].priorityId).toBe(20);
  });

  it('keeps a ticket priority in sync when the ticket is updated', () => {
    const state = createBoardState();

    state.updateTicket({...ticketSummary(4, null, 1), priorityId: 21});

    expect(state.findTicket(4)?.priorityId).toBe(21);
  });

  it('replaces the columns in the given order, keeping tickets of known columns and dropping removed ones', () => {
    const state = createBoardState();

    state.setColumns([
      {id: 11, title: 'Finished', position: 0, tickets: []},
      {id: 12, title: 'Review', position: 1, tickets: []},
    ]);

    expect(state.board!.columns.map((column) => [column.id, column.title])).toEqual([[11, 'Finished'], [12, 'Review']]);
    expect(state.board!.columns[1].tickets).toEqual([]);
    expect(state.findTicket(1)).toBeNull();
    expect(state.board!.backlog.map((ticket) => ticket.id)).toEqual([3, 4]);
  });

  it('keeps the tickets already in a column when its columns are replaced', () => {
    const state = createBoardState();

    state.setColumns([{id: 10, title: 'Next', position: 0, tickets: []}]);

    expect(state.board!.columns[0].tickets.map((ticket) => ticket.id)).toEqual([1, 2]);
  });

  it('sets the board title and project only for the same board', () => {
    const state = createBoardState();

    state.setBoardMeta({id: 9, title: 'Sprint 13', projectId: 5});
    state.setBoardMeta({id: 99, title: 'Other', projectId: null});

    expect(state.board!.title).toBe('Sprint 13');
    expect(state.board!.projectId).toBe(5);
  });
});
