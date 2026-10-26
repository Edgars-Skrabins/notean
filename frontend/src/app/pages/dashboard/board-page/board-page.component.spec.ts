import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap} from "@angular/router";
import {of} from "rxjs";
import {BoardPageComponent} from "./board-page.component";
import {BoardService} from "@services/board.service";
import {BoardListService} from "@services/board-list.service";
import {FavoriteService} from "@services/favorite.service";
import {NavigationService} from "@services/navigation.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {PHRASES} from "@config/phrases";
import {AppRoutes} from "../../../app/app-routes.enum";
import {BoardPageStateService} from "./board-page-state.service";
import {BoardChannelService} from "@services/board-channel.service";
import {boardDetail, createBoardState} from "../../../testing/boardFixtures";

describe('BoardPageComponent', () => {
  let component: BoardPageComponent;
  let state: BoardPageStateService;
  let boardService: jasmine.SpyObj<BoardService>;
  let boardListService: jasmine.SpyObj<BoardListService>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let boardChannelService: jasmine.SpyObj<BoardChannelService>;

  beforeEach(() => {
    state = createBoardState();
    boardService = jasmine.createSpyObj<BoardService>('BoardService', ['renameBoard', 'deleteBoard', 'setBoardProject']);
    boardListService = jasmine.createSpyObj<BoardListService>('BoardListService', ['rename', 'remove', 'load']);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['renameItem', 'forgetItem']);
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    boardChannelService = jasmine.createSpyObj<BoardChannelService>('BoardChannelService', ['connect', 'disconnect']);
    const route = {paramMap: of(convertToParamMap({id: '9'}))} as unknown as ActivatedRoute;
    component = new BoardPageComponent(route, state, boardService, boardListService, favoriteService, navigationService, toastService, boardChannelService);
  });

  it('loads the board from the route and follows its live updates until destroyed', fakeAsync(() => {
    const load = spyOn(state, 'load').and.returnValue(Promise.resolve());

    component.ngOnInit();
    flushMicrotasks();

    expect(load).toHaveBeenCalledWith(9);
    expect(boardChannelService.connect).toHaveBeenCalledOnceWith(9);
    component.ngOnDestroy();
    expect(boardChannelService.disconnect).toHaveBeenCalled();
  }));

  it('does not follow live updates of a board that failed to load', fakeAsync(() => {
    spyOn(state, 'load').and.callFake(async () => {
      state.board = null;
      state.errorCode = 'BOARD_NOT_FOUND';
    });

    component.ngOnInit();
    flushMicrotasks();

    expect(boardChannelService.connect).not.toHaveBeenCalled();
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

    expect(boardChannelService.disconnect).toHaveBeenCalledBefore(boardService.deleteBoard);
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
    expect(boardChannelService.connect).toHaveBeenCalledWith(9);
  }));

  it('moves the board to another project and refreshes the sidebar', fakeAsync(() => {
    boardService.setBoardProject.and.returnValue(Promise.resolve({success: true, board: {...boardDetail(), projectId: 4}}));

    component.handleProjectChange(4);
    flushMicrotasks();

    expect(boardService.setBoardProject).toHaveBeenCalledWith('abc', 9, 4);
    expect(state.board?.projectId).toBe(4);
    expect(boardListService.load).toHaveBeenCalled();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.SUCCESS, message: PHRASES.PROJECT_UPDATED});
  }));

  it('keeps the project and shows a toast when moving fails', fakeAsync(() => {
    boardService.setBoardProject.and.returnValue(Promise.resolve({success: false, code: 'PROJECT_INVALID'}));

    component.handleProjectChange(4);
    flushMicrotasks();

    expect(state.board?.projectId).toBeNull();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.PROJECT_UPDATE_FAILED});
  }));
});
