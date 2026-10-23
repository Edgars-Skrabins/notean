import {ElementRef} from '@angular/core';
import {fakeAsync, flush, flushMicrotasks} from '@angular/core/testing';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {TranslateService} from '@ngx-translate/core';
import {PriorityListComponent} from './priority-list.component';
import {PriorityService} from '@services/priority.service';
import {ToastService} from '@services/toast.service';
import {BoardPriority} from '@models/priority.model';
import {ToastType} from '@models/toast.model';
import {PHRASES} from '@config/phrases';
import {BoardPageStateService} from '@pages/dashboard/board-page/board-page-state.service';
import {createBoardState} from '../../testing/boardFixtures';

describe('PriorityListComponent', () => {
  let component: PriorityListComponent;
  let state: BoardPageStateService;
  let priorityService: jasmine.SpyObj<PriorityService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    state = createBoardState();
    priorityService = jasmine.createSpyObj<PriorityService>('PriorityService', ['create', 'update', 'delete']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string | string[], params?: object) => `${key} ${JSON.stringify(params ?? {})}`);
    component = new PriorityListComponent(
      {nativeElement: document.createElement('div')} as ElementRef<HTMLElement>,
      state,
      priorityService,
      toastService,
      translateService
    );
  });

  function priority(id: number): BoardPriority {
    return state.board!.priorities.find((item) => item.id === id)!;
  }

  function names(): string[] {
    return component.priorities.map((item) => item.name);
  }

  it('commits a rename on Enter or blur and applies the returned priorities', fakeAsync(() => {
    priorityService.update.and.returnValue(Promise.resolve({
      success: true,
      priorities: [{...priority(20), name: 'Minor'}, priority(21)],
    }));
    component.startRename(priority(20));
    component.nameDraft = '  Minor  ';

    component.commitRename(priority(20));
    flush();

    expect(priorityService.update).toHaveBeenCalledWith('abc', 9, 20, {name: 'Minor'});
    expect(names()).toEqual(['Minor', 'High']);
    expect(component.editingId).toBeNull();
  }));

  it('cancels a rename on Escape, and an empty or unchanged name saves nothing', () => {
    component.startRename(priority(20));
    component.nameDraft = 'Something else';
    component.cancelRename();
    component.commitRename(priority(20));

    component.startRename(priority(21));
    component.nameDraft = '   ';
    component.commitRename(priority(21));

    component.startRename(priority(21));
    component.commitRename(priority(21));

    expect(priorityService.update).not.toHaveBeenCalled();
    expect(names()).toEqual(['Low', 'High']);
  });

  it('shows a toast and keeps the old name when the new one is taken', fakeAsync(() => {
    priorityService.update.and.returnValue(Promise.resolve({success: false, code: 'PRIORITY_NAME_TAKEN'}));
    component.startRename(priority(20));
    component.nameDraft = 'High';

    component.commitRename(priority(20));
    flush();

    expect(names()).toEqual(['Low', 'High']);
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: 'ERRORS.PRIORITIES.PRIORITY_NAME_TAKEN'});
  }));

  it('asks to confirm a delete with the number of tickets using the priority', () => {
    state.board!.backlog[0].priorityId = 21;
    state.board!.columns[0].tickets[0].priorityId = 21;

    component.requestDelete(priority(21));

    expect(component.deleteMessage).toBe(`${PHRASES.CONFIRM_DELETE_PRIORITY} {"name":"High","count":2}`);
  });

  it('uses the singular message when exactly one ticket uses the priority', () => {
    state.board!.backlog[0].priorityId = 21;

    component.requestDelete(priority(21));

    expect(component.deleteMessage).toBe(`${PHRASES.CONFIRM_DELETE_PRIORITY_ONE} {"name":"High"}`);
  });

  it('asks a plain confirmation when no ticket uses the priority', () => {
    component.requestDelete(priority(20));

    expect(component.deleteMessage).toBe(`${PHRASES.CONFIRM_DELETE_UNUSED_PRIORITY} {"name":"Low"}`);
  });

  it('deletes after confirmation and clears the priority from its tickets', fakeAsync(() => {
    state.board!.backlog[0].priorityId = 21;
    priorityService.delete.and.returnValue(Promise.resolve({success: true, priorities: [priority(20)]}));
    component.requestDelete(priority(21));

    component.handleConfirmDelete();
    flushMicrotasks();

    expect(priorityService.delete).toHaveBeenCalledWith('abc', 9, 21);
    expect(names()).toEqual(['Low']);
    expect(state.board!.backlog[0].priorityId).toBeNull();
    expect(component.pendingDeletion).toBeNull();
  }));

  it('reorders by dragging and saves the new position', fakeAsync(() => {
    priorityService.update.and.returnValue(Promise.resolve({
      success: true,
      priorities: [{...priority(21), position: 0}, {...priority(20), position: 1}],
    }));

    component.handleDropped({previousIndex: 1, currentIndex: 0} as CdkDragDrop<BoardPriority[]>);

    expect(names()).toEqual(['High', 'Low']);
    expect(priorityService.update).toHaveBeenCalledWith('abc', 9, 21, {position: 0});
    flushMicrotasks();
    expect(names()).toEqual(['High', 'Low']);
  }));

  it('puts the order back when saving a reorder fails', fakeAsync(() => {
    priorityService.update.and.returnValue(Promise.resolve({success: false, code: 'PRIORITY_SAVE_FAILED'}));

    component.handleDropped({previousIndex: 1, currentIndex: 0} as CdkDragDrop<BoardPriority[]>);
    flushMicrotasks();

    expect(names()).toEqual(['Low', 'High']);
  }));

  it('adds a grey "New priority" with a unique name and starts renaming it', fakeAsync(() => {
    translateService.instant.and.returnValue('New priority');
    state.board!.priorities.push({id: 22, name: 'New priority', color: 'grey', position: 2, ticketCount: 0});
    priorityService.create.and.returnValue(Promise.resolve({
      success: true,
      priority: {id: 23, name: 'New priority 2', color: 'grey', position: 3, ticketCount: 0},
    }));

    component.handleAdd();
    flush();

    expect(priorityService.create).toHaveBeenCalledWith('abc', 9, 'New priority 2', 'grey');
    expect(names()).toEqual(['Low', 'High', 'New priority', 'New priority 2']);
    expect(component.editingId).toBe(23);
    expect(component.nameDraft).toBe('New priority 2');
  }));
});
