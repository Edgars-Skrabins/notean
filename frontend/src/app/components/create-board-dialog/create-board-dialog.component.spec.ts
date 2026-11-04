import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {CreateBoardDialogComponent} from "./create-board-dialog.component";
import {BoardService} from "@services/board.service";
import {BoardListService} from "@services/board-list.service";
import {TeamService} from "@services/team.service";
import {BoardSummary} from "@models/board.model";
import {boardDetail} from "../../testing/boardFixtures";
import {projectFilterStub} from "../../testing/projectFilterStub";

describe('CreateBoardDialogComponent', () => {
  let component: CreateBoardDialogComponent;
  let boardService: jasmine.SpyObj<BoardService>;
  let boardListService: jasmine.SpyObj<BoardListService>;
  let created: BoardSummary[];

  beforeEach(() => {
    boardService = jasmine.createSpyObj<BoardService>('BoardService', ['createBoard']);
    boardListService = jasmine.createSpyObj<BoardListService>('BoardListService', ['add']);
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    component = new CreateBoardDialogComponent(boardService, boardListService, teamService, projectFilterStub(4).service);
    created = [];
    component.created.subscribe((board) => created.push(board));
  });

  it('creates a board in the selected project, adds it to the top and emits it', fakeAsync(() => {
    boardService.createBoard.and.returnValue(Promise.resolve({success: true, board: boardDetail()}));

    component.handleCreateConfirmed({title: 'Sprint 12'});
    flushMicrotasks();

    expect(boardService.createBoard).toHaveBeenCalledWith('abc', 'Sprint 12', 4, null);
    expect(boardListService.add).toHaveBeenCalled();
    expect(created.map((board) => board.id)).toEqual([9]);
  }));

  it('creates the board from the chosen template', fakeAsync(() => {
    boardService.createBoard.and.returnValue(Promise.resolve({success: true, board: boardDetail()}));
    component.selectedTemplateId = 5;

    component.handleCreateConfirmed({title: 'Roadmap'});
    flushMicrotasks();

    expect(boardService.createBoard).toHaveBeenCalledWith('abc', 'Roadmap', 4, 5);
  }));

  it('keeps the dialog open with the error when the template no longer exists', fakeAsync(() => {
    boardService.createBoard.and.returnValue(Promise.resolve({success: false, code: 'TEMPLATE_NOT_FOUND'}));
    component.selectedTemplateId = 5;

    component.handleCreateConfirmed({title: 'Roadmap'});
    flushMicrotasks();

    expect(component.createErrorMessage).toBe('ERRORS.TEMPLATES.TEMPLATE_NOT_FOUND');
    expect(boardListService.add).not.toHaveBeenCalled();
    expect(created).toEqual([]);
  }));
});
