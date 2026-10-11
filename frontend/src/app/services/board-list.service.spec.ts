import {BoardListService, orderBoards} from "./board-list.service";
import {BoardService} from "@services/board.service";
import {TeamService} from "@services/team.service";
import {BoardSummary} from "@models/board.model";

function board(id: number, createdAt: string): BoardSummary {
  return {id, title: `Board ${id}`, creator: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}}, createdAt, updatedAt: createdAt};
}

describe('orderBoards', () => {
  const boards = [board(1, '2026-01-01'), board(2, '2026-01-03'), board(3, '2026-01-02')];

  it('lists boards newest first without a stored order', () => {
    expect(orderBoards(boards, []).map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it('applies the stored order and drops unknown ids', () => {
    expect(orderBoards(boards, [1, 99, 3, 2]).map((item) => item.id)).toEqual([1, 3, 2]);
  });

  it('puts boards missing from the stored order first', () => {
    expect(orderBoards(boards, [1, 3]).map((item) => item.id)).toEqual([2, 1, 3]);
  });
});

describe('BoardListService', () => {
  let boardService: jasmine.SpyObj<BoardService>;
  let teamService: jasmine.SpyObj<TeamService>;

  function ids(service: BoardListService): number[] {
    let current: number[] = [];
    service.boards$.subscribe((boards) => current = boards.map((item) => item.id)).unsubscribe();
    return current;
  }

  beforeEach(() => {
    localStorage.clear();
    boardService = jasmine.createSpyObj<BoardService>('BoardService', ['listBoards']);
    boardService.listBoards.and.returnValue(Promise.resolve({success: true, boards: [board(1, '2026-01-01'), board(2, '2026-01-02')]}));
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
  });

  afterEach(() => localStorage.clear());

  it('loads the team boards in personal order', async () => {
    localStorage.setItem('boardOrder:abc', JSON.stringify([1, 2]));
    const service = new BoardListService(boardService, teamService);

    await service.load();

    expect(boardService.listBoards).toHaveBeenCalledWith('abc');
    expect(ids(service)).toEqual([1, 2]);
  });

  it('saves the order per team after a move', async () => {
    const service = new BoardListService(boardService, teamService);
    await service.load();

    service.move(0, 1);

    expect(ids(service)).toEqual([1, 2]);
    expect(localStorage.getItem('boardOrder:abc')).toBe('[1,2]');
  });

  it('adds new boards first, removes and renames them', async () => {
    const service = new BoardListService(boardService, teamService);
    await service.load();

    service.add(board(3, '2026-01-03'));
    service.remove(1);
    service.rename(2, 'Renamed');

    expect(ids(service)).toEqual([3, 2]);
    expect(localStorage.getItem('boardOrder:abc')).toBe('[3,2]');
  });

  it('remembers whether the list is open', () => {
    const service = new BoardListService(boardService, teamService);
    expect(service.isOpen).toBeTrue();

    service.toggleOpen();

    expect(localStorage.getItem('sidebarBoardsOpen')).toBe('false');
    expect(new BoardListService(boardService, teamService).isOpen).toBeFalse();
  });
});
