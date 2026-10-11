import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap} from "@angular/router";
import {of} from "rxjs";
import {BoardPageComponent} from "./board-page.component";
import {BoardService} from "@services/board.service";
import {BoardListService} from "@services/board-list.service";
import {FavoriteService} from "@services/favorite.service";
import {NavigationService} from "@services/navigation.service";
import {PHRASES} from "@config/phrases";
import {AppRoutes} from "../../../app/app-routes.enum";
import {BoardPageStateService} from "./board-page-state.service";
import {boardDetail, createBoardState} from "../../../testing/boardFixtures";

describe('BoardPageComponent', () => {
  let component: BoardPageComponent;
  let state: BoardPageStateService;
  let boardService: jasmine.SpyObj<BoardService>;
  let boardListService: jasmine.SpyObj<BoardListService>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let navigationService: jasmine.SpyObj<NavigationService>;

  beforeEach(() => {
    state = createBoardState();
    boardService = jasmine.createSpyObj<BoardService>('BoardService', ['renameBoard', 'deleteBoard']);
    boardListService = jasmine.createSpyObj<BoardListService>('BoardListService', ['rename', 'remove', 'load']);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['renameItem', 'forgetItem']);
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate']);
    const route = {paramMap: of(convertToParamMap({id: '9'}))} as unknown as ActivatedRoute;
    component = new BoardPageComponent(route, state, boardService, boardListService, favoriteService, navigationService);
  });

  it('loads the board from the route', fakeAsync(() => {
    const load = spyOn(state, 'load').and.returnValue(Promise.resolve());

    component.ngOnInit();
    flushMicrotasks();

    expect(load).toHaveBeenCalledWith(9);
    component.ngOnDestroy();
  }));

  it('renames the board everywhere it is shown', fakeAsync(() => {
    boardService.renameBoard.and.returnValue(Promise.resolve({success: true, board: {...boardDetail(), title: 'Sprint 13'}}));
    component.startRename();
    component.renameDraft = ' Sprint 13 ';

    component.commitRename();
    flushMicrotasks();

    expect(boardService.renameBoard).toHaveBeenCalledWith('abc', 9, 'Sprint 13');
    expect(state.board?.title).toBe('Sprint 13');
    expect(boardListService.rename).toHaveBeenCalledWith(9, 'Sprint 13');
    expect(favoriteService.renameItem).toHaveBeenCalledWith('Board', 9, 'Sprint 13');
  }));

  it('skips the request when the title is blank or unchanged', () => {
    component.startRename();
    component.commitRename();
    component.startRename();
    component.renameDraft = '  ';
    component.commitRename();

    expect(boardService.renameBoard).not.toHaveBeenCalled();
  });

  it('deletes the board, removes it from the sidebar and favorites and goes home', fakeAsync(() => {
    boardService.deleteBoard.and.returnValue(Promise.resolve({success: true}));
    component.handleDelete();

    component.handleConfirmDelete();
    flushMicrotasks();

    expect(boardListService.remove).toHaveBeenCalledWith(9);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Board', 9);
    expect(navigationService.navigate).toHaveBeenCalledWith(AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME);
  }));

  it('stays on the board and shows the error when deleting fails', fakeAsync(() => {
    boardService.deleteBoard.and.returnValue(Promise.resolve({success: false, code: 'BOARD_NOT_FOUND'}));

    component.handleConfirmDelete();
    flushMicrotasks();

    expect(component.alertMessage).toBe('ERRORS.BOARDS.BOARD_NOT_FOUND');
    expect(navigationService.navigate).not.toHaveBeenCalled();
  }));
});
