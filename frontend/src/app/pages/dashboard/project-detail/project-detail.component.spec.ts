import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap} from '@angular/router';
import {ProjectDetailComponent} from './project-detail.component';
import {ProjectService} from '@services/project.service';
import {TeamService} from '@services/team.service';
import {ToastService} from '@services/toast.service';
import {NavigationService} from '@services/navigation.service';
import {ToastType} from '@models/toast.model';
import {ProjectDetail} from '@models/project.model';
import {PHRASES} from '@config/phrases';
import {AppRoutes} from '../../../app/app-routes.enum';
import {projectFilterStub, ProjectFilterStub} from '../../../testing/projectFilterStub';

const alice = {id: 1, nickname: 'alice', avatar: {color: 'red' as const, imageUrl: null}};
const bob = {id: 2, nickname: 'bob', avatar: {color: 'blue' as const, imageUrl: null}};

function projectDetail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {id: 5, name: 'Game', description: 'Fun', owner: alice, memberCount: 2, canManage: true, members: [alice, bob], createdAt: '', ...overrides};
}

describe('ProjectDetailComponent', () => {
  let component: ProjectDetailComponent;
  let projectService: jasmine.SpyObj<ProjectService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let projectFilter: ProjectFilterStub;

  beforeEach(fakeAsync(() => {
    projectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['getProject', 'updateProject', 'deleteProject']);
    projectService.getProject.and.returnValue(Promise.resolve({success: true, project: projectDetail()}));
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode', 'fetchTeamMembers']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    teamService.fetchTeamMembers.and.returnValue(Promise.resolve([]));
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate']);
    projectFilter = projectFilterStub(5);
    const route = {snapshot: {paramMap: convertToParamMap({id: '5'})}} as unknown as ActivatedRoute;
    component = new ProjectDetailComponent(route, projectService, projectFilter.service, teamService, toastService, navigationService);
    component.ngOnInit();
    flushMicrotasks();
  }));

  it('loads the project into the form without unsaved changes', () => {
    expect(projectService.getProject).toHaveBeenCalledWith('abc', 5);
    expect(component.params).toEqual({name: 'Game', description: 'Fun', ownerUserId: 1, memberIds: [1, 2]});
    expect(component.hasUnsavedChanges).toBeFalse();
  });

  it('has unsaved changes after editing, but not after reordering members', () => {
    component.handleParamsChange({...component.params!, memberIds: [2, 1]});
    expect(component.hasUnsavedChanges).toBeFalse();

    component.handleParamsChange({...component.params!, name: 'Game 2'});
    expect(component.hasUnsavedChanges).toBeTrue();
  });

  it('saves the trimmed params and shows a toast', fakeAsync(() => {
    projectService.updateProject.and.returnValue(Promise.resolve({success: true, project: projectDetail({name: 'Game 2'})}));
    component.handleParamsChange({...component.params!, name: ' Game 2 '});

    component.handleSave();
    flushMicrotasks();

    expect(projectService.updateProject).toHaveBeenCalledWith('abc', 5, {name: 'Game 2', description: 'Fun', ownerUserId: 1, memberIds: [1, 2]});
    expect(component.hasUnsavedChanges).toBeFalse();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.SUCCESS, message: PHRASES.PROJECT_SAVED});
  }));

  it('shows a taken name under the field', fakeAsync(() => {
    projectService.updateProject.and.returnValue(Promise.resolve({success: false, code: 'PROJECT_NAME_TAKEN'}));
    component.handleParamsChange({...component.params!, name: 'Secret'});

    component.handleSave();
    flushMicrotasks();

    expect(component.nameError).toBe('ERRORS.PROJECTS.PROJECT_NAME_TAKEN');
    expect(component.hasUnsavedChanges).toBeTrue();
  }));

  it('deletes the project, falls back to All and returns to the list', fakeAsync(() => {
    projectService.deleteProject.and.returnValue(Promise.resolve({success: true}));

    component.handleConfirmDelete({mode: 'keep', confirmName: 'Game'});
    flushMicrotasks();

    expect(projectService.deleteProject).toHaveBeenCalledWith('abc', 5, 'keep', 'Game');
    expect(projectFilter.selected.value).toBeNull();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.SUCCESS, message: PHRASES.PROJECT_DELETED});
    expect(navigationService.navigate).toHaveBeenCalledWith(AppRoutes.DASHBOARD, AppRoutes.PROJECTS);
  }));

  it('asks before leaving with unsaved changes', async () => {
    component.handleParamsChange({...component.params!, description: 'Changed'});

    const result = component.confirmLeave();
    expect(component.isLeaveConfirmOpen).toBeTrue();
    component.handleConfirmLeave();

    expect(await result).toBeTrue();
  });
});
