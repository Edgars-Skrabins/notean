import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {provideTranslateService} from '@ngx-translate/core';
import {ProjectDetailComponent} from './project-detail.component';
import {ProjectService} from '@services/project.service';
import {ProjectFilterService} from '@services/project-filter.service';
import {TeamService} from '@services/team.service';
import {ToastService} from '@services/toast.service';
import {NavigationService} from '@services/navigation.service';
import {PageService} from '@services/page.service';
import {DiagramService} from '@services/diagram.service';
import {BoardService} from '@services/board.service';
import {ProjectDetail} from '@models/project.model';
import {FolderedItemSummary} from '@models/foldered-item.model';
import {BoardSummary} from '@models/board.model';
import {TeamFeatures} from '@models/team.model';
import {PHRASES} from '@config/phrases';
import {AppRoutes} from '../../../app/app-routes.enum';
import {projectFilterStub} from '../../../testing/projectFilterStub';

const alice = {id: 1, nickname: 'alice', avatar: {color: 'red' as const, imageUrl: null}};
const bob = {id: 2, nickname: 'bob', avatar: {color: 'blue' as const, imageUrl: null}};

function projectDetail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {id: 5, name: 'Game', description: 'Fun', owner: bob, memberCount: 2, canManage: true, members: [alice, bob], createdAt: '', ...overrides};
}

function item(id: number, title: string, updatedAt: string): FolderedItemSummary {
  return {id, title, folderId: null, projectId: 5, lockVersion: 0, creator: alice, createdAt: updatedAt, updatedAt};
}

function board(id: number, title: string, updatedAt: string): BoardSummary {
  return {id, title, projectId: 5, creator: alice, createdAt: updatedAt, updatedAt};
}

describe('ProjectDetailComponent', () => {
  let fixture: ComponentFixture<ProjectDetailComponent>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let pageService: jasmine.SpyObj<PageService>;
  let diagramService: jasmine.SpyObj<DiagramService>;
  let boardService: jasmine.SpyObj<BoardService>;
  let teamService: jasmine.SpyObj<TeamService>;
  let router: jasmine.SpyObj<Router>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let features: BehaviorSubject<TeamFeatures>;

  async function render(project: ProjectDetail = projectDetail()) {
    projectService.getProject.and.returnValue(Promise.resolve({success: true, project}));
    fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texts(selector: string): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector)).map((element) => (element as HTMLElement).textContent!.trim());
  }

  function settingsButton(): HTMLElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('.projectDetail__sidebar app-button') as NodeListOf<HTMLElement>)
      .find((element) => element.textContent!.trim() === PHRASES.SETTINGS);
  }

  beforeEach(async () => {
    features = new BehaviorSubject<TeamFeatures>({pages: true, diagrams: true, boards: true, chat: true});
    projectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['getProject', 'updateProject', 'deleteProject']);
    pageService = jasmine.createSpyObj<PageService>('PageService', ['list']);
    pageService.list.and.returnValue(Promise.resolve({success: true, items: [item(1, 'Old page', '2026-10-01T10:00:00Z'), item(2, 'New page', '2026-10-20T10:00:00Z')], hasMore: false}));
    diagramService = jasmine.createSpyObj<DiagramService>('DiagramService', ['list']);
    diagramService.list.and.returnValue(Promise.resolve({success: true, items: [], hasMore: false}));
    boardService = jasmine.createSpyObj<BoardService>('BoardService', ['listBoards']);
    boardService.listBoards.and.returnValue(Promise.resolve({success: true, boards: [board(9, 'Sprint', '2026-10-10T10:00:00Z')]}));
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode', 'fetchTeamMembers', 'isFeatureEnabled'], {features$: features});
    teamService.getCurrentTeamCode.and.returnValue('abc');
    teamService.fetchTeamMembers.and.returnValue(Promise.resolve([]));
    teamService.isFeatureEnabled.and.callFake((feature) => features.value[feature]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate', 'navigateReplacingUrl']);
    const route = {snapshot: {paramMap: convertToParamMap({id: '5'})}} as unknown as ActivatedRoute;

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent],
      providers: [
        provideTranslateService(),
        {provide: ActivatedRoute, useValue: route},
        {provide: Router, useValue: router},
        {provide: ProjectService, useValue: projectService},
        {provide: PageService, useValue: pageService},
        {provide: DiagramService, useValue: diagramService},
        {provide: BoardService, useValue: boardService},
        {provide: TeamService, useValue: teamService},
        {provide: ProjectFilterService, useValue: projectFilterStub(5).service},
        {provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['show'])},
        {provide: NavigationService, useValue: navigationService},
      ],
    }).compileComponents();
  });

  it('groups the project items by type in the order they load, hiding empty groups', async () => {
    await render();

    expect(pageService.list).toHaveBeenCalledWith('abc', {projectId: 5, offset: 0});
    expect(diagramService.list).toHaveBeenCalledWith('abc', {projectId: 5, offset: 0});
    expect(boardService.listBoards).toHaveBeenCalledWith('abc', 5);
    expect(texts('.projectDetail__groupTitle')).toEqual([PHRASES.DOCUMENT_PAGES, PHRASES.BOARDS]);
    expect(texts('.projectItemRow__title')).toEqual(['Old page', 'New page', 'Sprint']);
    expect(texts('.projectDetail__empty')).toEqual([]);
    expect(fixture.nativeElement.querySelector('.loadMore')).toBeNull();
  });

  it('sends a missing or hidden project to the unavailable screen', async () => {
    projectService.getProject.and.returnValue(Promise.resolve({success: false, code: 'PROJECT_NOT_FOUND'}));
    fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigationService.navigateReplacingUrl).toHaveBeenCalledOnceWith(AppRoutes.UNAVAILABLE);
  });

  it('loads more pages after the loaded ones', async () => {
    pageService.list.and.returnValue(Promise.resolve({success: true, items: [item(1, 'Old page', '2026-10-01T10:00:00Z')], hasMore: true}));
    await render();

    pageService.list.and.returnValue(Promise.resolve({success: true, items: [item(3, 'Plan', '2026-10-02T10:00:00Z')], hasMore: false}));
    (fixture.nativeElement.querySelector('.loadMore') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(pageService.list).toHaveBeenCalledWith('abc', {projectId: 5, offset: 1});
    expect(texts('.projectItemRow__title')).toEqual(['Old page', 'Plan', 'Sprint']);
    expect(fixture.nativeElement.querySelector('.loadMore')).toBeNull();
  });

  it('shows the empty message when the project has no items', async () => {
    pageService.list.and.returnValue(Promise.resolve({success: true, items: [], hasMore: false}));
    boardService.listBoards.and.returnValue(Promise.resolve({success: true, boards: []}));
    await render();

    expect(texts('.projectDetail__groupTitle')).toEqual([]);
    expect(texts('.projectDetail__empty')).toEqual([PHRASES.NO_PROJECT_ITEMS]);
  });

  it('skips and hides the items of disabled features', async () => {
    features.next({pages: true, diagrams: true, boards: false, chat: true});
    await render();

    expect(boardService.listBoards).not.toHaveBeenCalled();
    expect(texts('.projectDetail__groupTitle')).toEqual([PHRASES.DOCUMENT_PAGES]);

    features.next({pages: false, diagrams: true, boards: false, chat: true});
    fixture.detectChanges();

    expect(texts('.projectDetail__empty')).toEqual([PHRASES.NO_PROJECT_ITEMS]);
  });

  it('lists the owner first with the Owner label', async () => {
    await render();

    expect(texts('.projectDetail__nickname')).toEqual(['bob', 'alice']);
    expect(texts('.projectDetail__ownerLabel')).toEqual([PHRASES.OWNER]);
  });

  it('shows Settings only to users who can manage the project', async () => {
    await render(projectDetail({canManage: false}));
    expect(settingsButton()).toBeUndefined();

    await render(projectDetail({canManage: true}));
    expect(settingsButton()).toBeDefined();
  });

  it('updates the header when the settings are saved', async () => {
    await render();

    fixture.componentInstance.handleSaved(projectDetail({name: 'Game 2', description: '', members: [bob]}));
    fixture.detectChanges();

    expect(texts('.projectDetail__title')).toEqual(['Game 2']);
    expect(texts('.projectDetail__description')).toEqual([]);
    expect(texts('.projectDetail__nickname')).toEqual(['bob']);
  });

  it('opens pages and diagrams in their popup and boards on kanban', async () => {
    diagramService.list.and.returnValue(Promise.resolve({success: true, items: [item(4, 'Flow', '2026-10-05T10:00:00Z')], hasMore: false}));
    await render();

    const rows = fixture.nativeElement.querySelectorAll('.projectItemRow') as NodeListOf<HTMLElement>;
    rows[0].click();
    rows[2].click();
    rows[3].click();

    expect(router.navigate.calls.allArgs()).toEqual([
      [[AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, 1]],
      [[AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, 4]],
      [[AppRoutes.DASHBOARD, AppRoutes.BOARDS, 9, AppRoutes.KANBAN]],
    ]);
  });

  it('lets the route guard through without the settings open and asks the dialog when open', async () => {
    await render();
    expect(fixture.componentInstance.confirmLeave()).toBeTrue();

    fixture.componentInstance.handleOpenSettings();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = fixture.componentInstance.settingsDialog!;
    dialog.handleParamsChange({...dialog.params, name: 'Changed'});
    const result = fixture.componentInstance.confirmLeave();
    expect(dialog.isLeaveConfirmOpen).toBeTrue();
    dialog.handleConfirmLeave();

    expect(await result).toBeTrue();
  });
});
