import {fakeAsync, flushMicrotasks, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from "@angular/router";
import {BehaviorSubject} from "rxjs";
import {provideTranslateService} from "@ngx-translate/core";
import {CdkDragDrop} from "@angular/cdk/drag-drop";
import {SidebarBoardsComponent} from "./sidebar-boards.component";
import {BoardService} from "@services/board.service";
import {BoardListService} from "@services/board-list.service";
import {TeamService} from "@services/team.service";
import {BoardSummary} from "@models/board.model";
import {AppRoutes} from "../../app/app-routes.enum";
import {boardDetail} from "../../testing/boardFixtures";
import {projectFilterStub} from "../../testing/projectFilterStub";
import {ProjectFilterService} from "@services/project-filter.service";
import {TemplateService} from "@services/template.service";

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
    component = new SidebarBoardsComponent(router, boardListService, boardService, teamService, projectFilterStub(4).service);
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
    expect(boardService.createBoard).toHaveBeenCalledWith('abc', 'Sprint 12', 4, null);
    expect(boardListService.add).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 9, AppRoutes.KANBAN]);
  }));

  it('creates the board from the chosen template', fakeAsync(() => {
    boardService.createBoard.and.returnValue(Promise.resolve({success: true, board: boardDetail()}));
    component.handleCreate();
    component.selectedTemplateId = 5;

    component.handleCreateConfirmed({title: 'Roadmap'});
    flushMicrotasks();

    expect(boardService.createBoard).toHaveBeenCalledWith('abc', 'Roadmap', 4, 5);
  }));

  it('keeps the dialog open with the error when the template no longer exists', fakeAsync(() => {
    boardService.createBoard.and.returnValue(Promise.resolve({success: false, code: 'TEMPLATE_NOT_FOUND'}));
    component.handleCreate();
    component.selectedTemplateId = 5;

    component.handleCreateConfirmed({title: 'Roadmap'});
    flushMicrotasks();

    expect(component.isCreateDialogOpen).toBeTrue();
    expect(component.createErrorMessage).toBe('ERRORS.TEMPLATES.TEMPLATE_NOT_FOUND');
    expect(boardListService.add).not.toHaveBeenCalled();
  }));
});

describe('SidebarBoardsComponent create row', () => {
  function render(boards: BoardSummary[]) {
    const boardListService = {boards$: new BehaviorSubject(boards), isOpen: true, load: () => Promise.resolve()};
    TestBed.configureTestingModule({
      imports: [SidebarBoardsComponent],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        {provide: BoardListService, useValue: boardListService},
        {provide: BoardService, useValue: {}},
        {provide: TeamService, useValue: {getCurrentTeamCode: () => 'abc'}},
        {provide: TemplateService, useValue: {list: () => Promise.resolve({success: true, templates: [], hasMore: false})}},
        {provide: ProjectFilterService, useValue: projectFilterStub().service},
      ],
    });
    const fixture = TestBed.createComponent(SidebarBoardsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('lists the boards with the create and board templates rows last', () => {
    const fixture = render([boardDetail()]);
    const rows = Array.from(fixture.nativeElement.querySelectorAll('.sidebarList__row')) as HTMLElement[];

    expect(rows.length).toBe(3);
    expect(rows[1].classList).toContain('sidebarList__create');
    expect(rows[2].getAttribute('href')).toBe('/dashboard/board-templates');
    expect(fixture.nativeElement.querySelector('app-icon-button')).toBeNull();
  });

  it('opens the create dialog from the create row', () => {
    const fixture = render([]);

    (fixture.nativeElement.querySelector('.sidebarList__create') as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-create-named-item-dialog')).not.toBeNull();
  });
});
