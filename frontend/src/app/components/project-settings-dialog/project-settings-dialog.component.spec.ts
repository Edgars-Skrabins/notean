import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {ProjectSettingsDialogComponent} from './project-settings-dialog.component';
import {ProjectService} from '@services/project.service';
import {TeamService} from '@services/team.service';
import {ToastService} from '@services/toast.service';
import {ToastType} from '@models/toast.model';
import {ProjectDetail} from '@models/project.model';
import {PHRASES} from '@config/phrases';
import {projectFilterStub, ProjectFilterStub} from '../../testing/projectFilterStub';

const alice = {id: 1, nickname: 'alice', avatar: {color: 'red' as const, imageUrl: null}};
const bob = {id: 2, nickname: 'bob', avatar: {color: 'blue' as const, imageUrl: null}};

function projectDetail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {id: 5, name: 'Game', description: 'Fun', owner: alice, memberCount: 2, canManage: true, members: [alice, bob], createdAt: '', ...overrides};
}

describe('ProjectSettingsDialogComponent', () => {
  let component: ProjectSettingsDialogComponent;
  let projectService: jasmine.SpyObj<ProjectService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let projectFilter: ProjectFilterStub;

  beforeEach(() => {
    projectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['updateProject', 'deleteProject']);
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    projectFilter = projectFilterStub(5);
    component = new ProjectSettingsDialogComponent(projectService, projectFilter.service, teamService, toastService);
    component.project = projectDetail();
    component.ngOnInit();
  });

  it('has nothing to save until the form changes, ignoring member order', () => {
    expect(component.params).toEqual({name: 'Game', description: 'Fun', ownerUserId: 1, memberIds: [1, 2]});
    expect(component.hasUnsavedChanges).toBeFalse();

    component.handleParamsChange({...component.params, memberIds: [2, 1]});
    expect(component.hasUnsavedChanges).toBeFalse();

    component.handleSave();
    expect(projectService.updateProject).not.toHaveBeenCalled();

    component.handleParamsChange({...component.params, name: 'Game 2'});
    expect(component.hasUnsavedChanges).toBeTrue();
  });

  it('saves the trimmed params, shows a toast and emits the updated project', fakeAsync(() => {
    const updated = projectDetail({name: 'Game 2'});
    projectService.updateProject.and.returnValue(Promise.resolve({success: true, project: updated}));
    const saved = spyOn(component.saved, 'emit');
    component.handleParamsChange({...component.params, name: ' Game 2 '});

    component.handleSave();
    flushMicrotasks();

    expect(projectService.updateProject).toHaveBeenCalledWith('abc', 5, {name: 'Game 2', description: 'Fun', ownerUserId: 1, memberIds: [1, 2]});
    expect(saved).toHaveBeenCalledWith(updated);
    expect(component.hasUnsavedChanges).toBeFalse();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.SUCCESS, message: PHRASES.PROJECT_SAVED});
  }));

  it('shows a taken name under the field', fakeAsync(() => {
    projectService.updateProject.and.returnValue(Promise.resolve({success: false, code: 'PROJECT_NAME_TAKEN'}));
    const saved = spyOn(component.saved, 'emit');
    component.handleParamsChange({...component.params, name: 'Secret'});

    component.handleSave();
    flushMicrotasks();

    expect(component.nameError).toBe('ERRORS.PROJECTS.PROJECT_NAME_TAKEN');
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(saved).not.toHaveBeenCalled();
  }));

  it('deletes the project, falls back to All and emits deleted', fakeAsync(() => {
    projectService.deleteProject.and.returnValue(Promise.resolve({success: true}));
    const deleted = spyOn(component.deleted, 'emit');

    component.handleConfirmDelete({mode: 'keep', confirmName: 'Game'});
    flushMicrotasks();

    expect(projectService.deleteProject).toHaveBeenCalledWith('abc', 5, 'keep', 'Game');
    expect(projectFilter.selected.value).toBeNull();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.SUCCESS, message: PHRASES.PROJECT_DELETED});
    expect(deleted).toHaveBeenCalled();
  }));

  it('closes right away without changes', fakeAsync(() => {
    const closed = spyOn(component.closed, 'emit');

    component.handleClose();
    flushMicrotasks();

    expect(component.isLeaveConfirmOpen).toBeFalse();
    expect(closed).toHaveBeenCalled();
  }));

  it('asks before closing with unsaved changes', fakeAsync(() => {
    const closed = spyOn(component.closed, 'emit');
    component.handleParamsChange({...component.params, description: 'Changed'});

    component.handleClose();
    flushMicrotasks();
    expect(component.isLeaveConfirmOpen).toBeTrue();
    expect(closed).not.toHaveBeenCalled();

    component.handleCancelLeave();
    flushMicrotasks();
    expect(closed).not.toHaveBeenCalled();

    component.handleClose();
    component.handleConfirmLeave();
    flushMicrotasks();
    expect(closed).toHaveBeenCalled();
  }));
});
