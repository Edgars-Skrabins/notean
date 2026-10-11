import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {Router} from "@angular/router";
import {CdkDragDrop} from "@angular/cdk/drag-drop";
import {SidebarBoardsComponent} from "./sidebar-boards.component";
import {BoardService} from "@services/board.service";
import {BoardListService} from "@services/board-list.service";
import {TeamService} from "@services/team.service";
import {BoardSummary} from "@models/board.model";
import {AppRoutes} from "../../app/app-routes.enum";
import {boardDetail} from "../../testing/boardFixtures";

describe('SidebarBoardsComponent', () => {
  let component: SidebarBoardsComponent;
  let router: jasmine.SpyObj<Router>;
  let boardService: jasmine.SpyObj<BoardService>;
  let boardListService: jasmine.SpyObj<BoardListService>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    boardService = jasmine.createSpyObj<BoardService>('BoardService', ['createBoard']);
    boardListService = jasmine.createSpyObj<BoardListService>('BoardListService', ['load', 'move', 'add', 'toggleOpen']);
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    component = new SidebarBoardsComponent(router, boardListService, boardService, teamService);
  });

  it('loads the boards on init', () => {
    component.ngOnInit();

    expect(boardListService.load).toHaveBeenCalled();
  });

  it('opens a board on its kanban tab', () => {
    component.handleOpen(boardDetail());

    expect(router.navigate).toHaveBeenCalledWith([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 9, AppRoutes.KANBAN]);
  });

  it('saves a new order only when a row actually moved', () => {
    component.handleDrop({previousIndex: 1, currentIndex: 1} as CdkDragDrop<BoardSummary[]>);
    component.handleDrop({previousIndex: 2, currentIndex: 0} as CdkDragDrop<BoardSummary[]>);

    expect(boardListService.move).toHaveBeenCalledOnceWith(2, 0);
  });

  it('creates a board, adds it to the top and opens it', fakeAsync(() => {
    boardService.createBoard.and.returnValue(Promise.resolve({success: true, board: boardDetail()}));
    component.handleCreate();

    component.handleCreateConfirmed({title: 'Sprint 12'});
    flushMicrotasks();

    expect(component.isCreateDialogOpen).toBeFalse();
    expect(boardService.createBoard).toHaveBeenCalledWith('abc', 'Sprint 12');
    expect(boardListService.add).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 9, AppRoutes.KANBAN]);
  }));
});
