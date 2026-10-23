import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {TranslateModule} from '@ngx-translate/core';
import {MyWorkComponent} from './my-work.component';
import {MyWorkService} from '@services/my-work.service';
import {TeamService} from '@services/team.service';
import {ProjectFilterService} from '@services/project-filter.service';
import {MyWorkResponse, MyWorkTicket} from '@models/my-work.model';
import {PHRASES} from '@config/phrases';
import {AppRoutes} from '../../app/app-routes.enum';
import {projectFilterStub, ProjectFilterStub} from '../../testing/projectFilterStub';

function ticket(id: number, boardId: number, columnTitle: string | null): MyWorkTicket {
  return {
    id,
    title: `Ticket ${id}`,
    boardId,
    boardTitle: `Board ${boardId}`,
    columnId: columnTitle ? 1 : null,
    columnTitle,
    assignees: [{id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}}],
    updatedAt: '',
  };
}

describe('MyWorkComponent', () => {
  let fixture: ComponentFixture<MyWorkComponent>;
  let myWorkService: jasmine.SpyObj<MyWorkService>;
  let router: jasmine.SpyObj<Router>;
  let projectFilter: ProjectFilterStub;

  async function render(response: MyWorkResponse) {
    myWorkService.listMyWork.and.returnValue(Promise.resolve(response));
    fixture = TestBed.createComponent(MyWorkComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texts(selector: string): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector)).map((element) => (element as HTMLElement).textContent!.trim());
  }

  beforeEach(async () => {
    projectFilter = projectFilterStub();
    myWorkService = jasmine.createSpyObj<MyWorkService>('MyWorkService', ['listMyWork']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');

    await TestBed.configureTestingModule({
      imports: [MyWorkComponent, TranslateModule.forRoot()],
      providers: [
        {provide: MyWorkService, useValue: myWorkService},
        {provide: TeamService, useValue: teamService},
        {provide: Router, useValue: router},
        {provide: ProjectFilterService, useValue: projectFilter.service},
      ],
    }).compileComponents();
  });

  it('renders a group per board with its tickets and their place', async () => {
    await render({success: true, tickets: [ticket(1, 5, 'Doing'), ticket(2, 7, null), ticket(3, 5, 'To Do')]});

    expect(myWorkService.listMyWork).toHaveBeenCalledWith('abc', null);
    expect(texts('.myWork__board')).toEqual(['Board 5', 'Board 7']);
    expect(texts('.myWork__ticketTitle')).toEqual(['Ticket 1', 'Ticket 3', 'Ticket 2']);
    expect(texts('.myWork__ticketPlace')).toEqual(['Doing', 'To Do', PHRASES.BACKLOG]);
    expect(fixture.nativeElement.querySelectorAll('app-avatar-stack').length).toBe(3);
  });

  it('shows the empty text when nothing is assigned', async () => {
    await render({success: true, tickets: []});

    expect(texts('.myWork__message')).toEqual([PHRASES.NOTHING_ASSIGNED]);
  });

  it('shows the error text when loading fails', async () => {
    await render({success: false, code: 'NETWORK_ERROR'});

    expect(texts('.myWork__message')).toEqual([PHRASES.MY_WORK_LOAD_FAILED]);
  });

  it('opens tickets over the right tab and boards on kanban', async () => {
    await render({success: true, tickets: [ticket(1, 5, 'Doing'), ticket(2, 5, null)]});

    (fixture.nativeElement.querySelectorAll('.myWork__ticket')[1] as HTMLElement).click();
    (fixture.nativeElement.querySelector('.myWork__board') as HTMLElement).click();

    expect(router.navigate).toHaveBeenCalledWith([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 5, AppRoutes.LIST, AppRoutes.TICKETS, 2]);
    expect(router.navigate).toHaveBeenCalledWith([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 5, AppRoutes.KANBAN]);
  });

  it('reloads for the newly selected project', async () => {
    await render({success: true, tickets: []});

    projectFilter.selected.next(4);

    expect(myWorkService.listMyWork).toHaveBeenCalledWith('abc', 4);
  });
});
