import {fakeAsync, flushMicrotasks, tick} from '@angular/core/testing';
import {Router} from '@angular/router';
import {ProjectsComponent} from './projects.component';
import {ProjectService} from '@services/project.service';
import {TeamService} from '@services/team.service';
import {AuthService} from '@services/auth.service';
import {ToastService} from '@services/toast.service';
import {ToastType} from '@models/toast.model';
import {ProjectDetail, ProjectSummary} from '@models/project.model';
import {AppRoutes} from '../../../app/app-routes.enum';
import {projectFilterStub, ProjectFilterStub} from '../../../testing/projectFilterStub';

const params = {name: 'Game', description: '', ownerUserId: 1, memberIds: [1]};

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let router: jasmine.SpyObj<Router>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let teamService: jasmine.SpyObj<TeamService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let projectFilter: ProjectFilterStub;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    projectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['createProject', 'listProjects']);
    projectService.listProjects.and.returnValue(Promise.resolve({success: true, projects: [], hasMore: false}));
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentRole', 'getCurrentTeamCode', 'fetchTeamMembers']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    teamService.fetchTeamMembers.and.returnValue(Promise.resolve([]));
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue({id: 1, email: 'alice@example.com'});
    projectFilter = projectFilterStub();
    component = new ProjectsComponent(router, projectFilter.service, projectService, teamService, toastService, authService);
  });

  function project(id: number): ProjectSummary {
    return {id, name: `P${id}`} as ProjectSummary;
  }

  it('loads the first page of projects on init', fakeAsync(() => {
    projectService.listProjects.and.returnValue(Promise.resolve({success: true, projects: [project(3)], hasMore: true}));

    component.ngOnInit();
    flushMicrotasks();

    expect(projectService.listProjects).toHaveBeenCalledOnceWith('abc', {search: '', offset: 0});
    expect(component.projects?.map((item) => item.id)).toEqual([3]);
    expect(component.hasMore).toBeTrue();
    component.ngOnDestroy();
  }));

  it('appends the next page on Load more', fakeAsync(() => {
    projectService.listProjects.and.returnValue(Promise.resolve({success: true, projects: [project(1), project(2)], hasMore: true}));
    component.ngOnInit();
    flushMicrotasks();

    projectService.listProjects.and.returnValue(Promise.resolve({success: true, projects: [project(3)], hasMore: false}));
    component.handleLoadMore();
    expect(component.isLoadingMore).toBeTrue();
    flushMicrotasks();

    expect(projectService.listProjects).toHaveBeenCalledWith('abc', {search: '', offset: 2});
    expect(component.projects?.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(component.hasMore).toBeFalse();
    expect(component.isLoadingMore).toBeFalse();
    component.ngOnDestroy();
  }));

  it('searches the server once, 300 ms after typing stops, and starts over', fakeAsync(() => {
    projectService.listProjects.and.returnValue(Promise.resolve({success: true, projects: [project(1), project(2)], hasMore: true}));
    component.ngOnInit();
    flushMicrotasks();

    projectService.listProjects.and.returnValue(Promise.resolve({success: true, projects: [project(7)], hasMore: false}));
    component.handleSearchChange('ga');
    tick(299);
    component.handleSearchChange(' game ');
    tick(300);

    expect(projectService.listProjects).toHaveBeenCalledTimes(2);
    expect(projectService.listProjects).toHaveBeenCalledWith('abc', {search: 'game', offset: 0});
    expect(component.projects?.map((item) => item.id)).toEqual([7]);
    component.ngOnDestroy();
  }));

  it('lets only team owners and admins create projects', () => {
    teamService.getCurrentRole.and.returnValue('admin');
    expect(component.canCreate).toBeTrue();

    teamService.getCurrentRole.and.returnValue('user');
    expect(component.canCreate).toBeFalse();
  });

  it('loads the team members before opening the dialog', fakeAsync(() => {
    component.handleNewProject();
    flushMicrotasks();

    expect(teamService.fetchTeamMembers).toHaveBeenCalledWith('abc');
    expect(component.isCreateDialogOpen).toBeTrue();
  }));

  it('creates a project, refreshes the selector and opens it', fakeAsync(() => {
    const load = spyOn(projectFilter.service, 'load').and.returnValue(Promise.resolve());
    projectService.createProject.and.returnValue(Promise.resolve({success: true, project: {id: 5} as ProjectDetail}));
    component.isCreateDialogOpen = true;

    component.handleCreate(params);
    flushMicrotasks();

    expect(component.isCreateDialogOpen).toBeFalse();
    expect(load).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([AppRoutes.DASHBOARD, AppRoutes.PROJECTS, 5]);
  }));

  it('shows a taken name under the field and keeps the dialog open', fakeAsync(() => {
    projectService.createProject.and.returnValue(Promise.resolve({success: false, code: 'PROJECT_NAME_TAKEN'}));
    component.isCreateDialogOpen = true;

    component.handleCreate(params);
    flushMicrotasks();

    expect(component.nameError).toBe('ERRORS.PROJECTS.PROJECT_NAME_TAKEN');
    expect(component.isCreateDialogOpen).toBeTrue();
    expect(component.isCreating).toBeFalse();
  }));

  it('shows other failures as a toast', fakeAsync(() => {
    projectService.createProject.and.returnValue(Promise.resolve({success: false, code: 'PROJECT_INVALID_MEMBERS'}));

    component.handleCreate(params);
    flushMicrotasks();

    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: 'ERRORS.PROJECTS.PROJECT_INVALID_MEMBERS'});
  }));
});
