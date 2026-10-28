import {fakeAsync, tick} from "@angular/core/testing";
import {TranslateService} from "@ngx-translate/core";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {TrashEntry} from "@models/trash.model";
import {ToastType} from "@models/toast.model";
import {errorPhrase} from "@utils/errorPhrase";
import {TrashComponent} from "./trash.component";
import {projectFilterStub, ProjectFilterStub} from "../../../testing/projectFilterStub";
import {trashServiceStub, TrashServiceStub} from "../../../testing/trashServiceStub";

function entry(id: number, title = `Item ${id}`): TrashEntry {
  return {
    id,
    itemType: 'Page',
    itemId: id * 10,
    title,
    projectId: null,
    board: null,
    childrenCount: 0,
    restorable: true,
    deletedBy: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}},
    deletedAt: '2026-10-20T00:00:00Z',
    purgeAt: '2026-11-03T00:00:00Z',
  };
}

describe('TrashComponent', () => {
  let component: TrashComponent;
  let trash: TrashServiceStub;
  let toastService: jasmine.SpyObj<ToastService>;
  let projectFilter: ProjectFilterStub;

  beforeEach(fakeAsync(() => {
    trash = trashServiceStub();
    trash.service.list.and.returnValue(Promise.resolve({success: true, entries: [entry(1), entry(2)], hasMore: false}));
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    projectFilter = projectFilterStub();
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode', 'getCurrentRole']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    component = new TrashComponent(trash.service, teamService, toastService, projectFilter.service, {} as TranslateService);
    component.ngOnInit();
    tick();
  }));

  afterEach(() => component.ngOnDestroy());

  it('removes a restored entry from the list', fakeAsync(() => {
    trash.service.restore.and.returnValue(Promise.resolve({success: true, restored: [{itemType: 'Page', itemId: 10}]}));

    component.handleRestore(entry(1));
    tick();

    expect(trash.service.restore).toHaveBeenCalledWith('abc', [1]);
    expect(component.entries!.map((item) => item.id)).toEqual([2]);
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.SUCCESS, message: 'ITEM_RESTORED'});
  }));

  it('drops an entry someone else already restored or deleted', fakeAsync(() => {
    trash.service.restore.and.returnValue(Promise.resolve({success: false, code: 'TRASH_ENTRY_NOT_FOUND'}));

    component.handleRestore(entry(1));
    tick();

    expect(component.entries!.map((item) => item.id)).toEqual([2]);
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: errorPhrase('TRASH_ENTRY_NOT_FOUND')});
  }));

  it('keeps a ticket whose board is in the trash and shows why', fakeAsync(() => {
    trash.service.restore.and.returnValue(Promise.resolve({success: false, code: 'TRASH_BOARD_IN_TRASH'}));

    component.handleRestore(entry(1));
    tick();

    expect(component.entries!.map((item) => item.id)).toEqual([1, 2]);
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: errorPhrase('TRASH_BOARD_IN_TRASH')});
  }));

  it('reloads with the type filter and the selected project', fakeAsync(() => {
    projectFilter.selected.next(5);
    tick();
    component.handleTypeChange('ticket');
    tick();

    expect(trash.service.list).toHaveBeenCalledWith('abc', {offset: 0, type: 'ticket', search: '', projectId: 5});
  }));

  it('deletes an entry forever only after confirming', fakeAsync(() => {
    trash.service.deleteForever.and.returnValue(Promise.resolve({success: true}));

    component.handleDeleteForever(entry(2));
    expect(trash.service.deleteForever).not.toHaveBeenCalled();
    component.handleConfirmDeleteForever();
    tick();

    expect(trash.service.deleteForever).toHaveBeenCalledWith('abc', 2);
    expect(component.entries!.map((item) => item.id)).toEqual([1]);
  }));
});
