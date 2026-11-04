import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {Router} from "@angular/router";
import {TranslateService} from "@ngx-translate/core";
import {BoardOverviewTabComponent} from "./board-overview-tab.component";
import {BoardService} from "@services/board.service";
import {BoardOverview} from "@models/board.model";
import {AppRoutes} from "../../../app/app-routes.enum";
import {createBoardState} from "../../../testing/boardFixtures";

const overview: BoardOverview = {
  totalTickets: 5,
  boardTickets: 4,
  backlogTickets: 1,
  columns: [{id: 10, title: 'To Do', ticketCount: 4}, {id: 11, title: 'Done', ticketCount: 0}],
  createdLast7Days: 2,
  updatedLast7Days: 3,
  recentTickets: [
    {id: 1, title: 'Bug', columnId: 10, columnTitle: 'To Do', updatedAt: '2026-10-10T00:00:00Z'},
    {id: 3, title: 'Idea', columnId: null, columnTitle: null, updatedAt: '2026-10-09T00:00:00Z'},
  ],
  assignees: [
    {user: null, ticketCount: 4},
    {user: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}}, ticketCount: 3},
    {user: {id: 2, nickname: 'bob', avatar: {color: 'blue', imageUrl: null}}, ticketCount: 1},
    {user: {id: 3, nickname: 'carol', avatar: {color: 'green', imageUrl: null}}, ticketCount: 0},
  ],
};

describe('BoardOverviewTabComponent', () => {
  let component: BoardOverviewTabComponent;
  let boardService: jasmine.SpyObj<BoardService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    boardService = jasmine.createSpyObj<BoardService>('BoardService', ['getOverview']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    component = new BoardOverviewTabComponent(router, createBoardState(), boardService, {getCurrentLang: () => 'en', getFallbackLang: () => 'en', instant: (key: string) => key} as unknown as TranslateService);
  });

  it('loads the overview for the board', fakeAsync(() => {
    boardService.getOverview.and.returnValue(Promise.resolve({success: true, overview}));

    component.ngOnInit();
    flushMicrotasks();

    expect(boardService.getOverview).toHaveBeenCalledWith('abc', 9);
    expect(component.overview).toEqual(overview);
  }));

  it('shows the error when loading fails', fakeAsync(() => {
    boardService.getOverview.and.returnValue(Promise.resolve({success: false, code: 'BOARD_NOT_FOUND'}));

    component.ngOnInit();
    flushMicrotasks();

    expect(component.alertMessage).toBe('ERRORS.BOARDS.BOARD_NOT_FOUND');
  }));

  it('lists the backlog first, then each column in board order', fakeAsync(() => {
    boardService.getOverview.and.returnValue(Promise.resolve({success: true, overview}));

    component.ngOnInit();
    flushMicrotasks();

    expect(component.statusRows).toEqual([
      {label: 'BACKLOG', value: 1},
      {label: 'To Do', value: 4},
      {label: 'Done', value: 0},
    ]);
  }));

  it('lists assignees with tickets largest first and Unassigned last', fakeAsync(() => {
    boardService.getOverview.and.returnValue(Promise.resolve({success: true, overview}));

    component.ngOnInit();
    flushMicrotasks();

    expect(component.assigneeRows).toEqual([
      {label: 'alice', value: 3},
      {label: 'bob', value: 1},
      {label: 'UNASSIGNED', value: 4},
    ]);
  }));

  it('leaves Unassigned out when every ticket has an assignee', fakeAsync(() => {
    boardService.getOverview.and.returnValue(Promise.resolve({success: true, overview: {...overview, assignees: [{user: null, ticketCount: 0}, ...overview.assignees.slice(1)]}}));

    component.ngOnInit();
    flushMicrotasks();

    expect(component.assigneeRows.map((row) => row.label)).toEqual(['alice', 'bob']);
  }));

  it('opens a recent ticket over the tab it lives on', () => {
    component.handleOpenTicket(overview.recentTickets[0]);
    component.handleOpenTicket(overview.recentTickets[1]);

    expect(router.navigate).toHaveBeenCalledWith([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 9, AppRoutes.KANBAN, AppRoutes.TICKETS, 1]);
    expect(router.navigate).toHaveBeenCalledWith([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 9, AppRoutes.LIST, AppRoutes.TICKETS, 3]);
  });
});
