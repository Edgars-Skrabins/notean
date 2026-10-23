import {fakeAsync, tick} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap} from '@angular/router';
import {of} from 'rxjs';
import {TranslateService} from "@ngx-translate/core";
import {PageService} from "@services/page.service";
import {PageEditingService} from "@services/page-editing.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {NavigationService} from "@services/navigation.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {FolderedItemDetail} from "@models/foldered-item.model";
import {errorPhrase} from "@utils/errorPhrase";
import {projectFilterStub, ProjectFilterStub} from "../../../testing/projectFilterStub";
import {AppRoutes} from "../../../app/app-routes.enum";
import {PageDetailComponent} from "./page-detail.component";

function createdPage(): FolderedItemDetail {
  return {
    id: 9,
    title: 'Plan',
    folderId: 3,
    projectId: 4,
    creator: {id: 1, nickname: 'alice', avatar: {color: 'blue', imageUrl: null}},
    createdAt: '',
    updatedAt: '',
    content: '<p>Hi</p>',
    contributors: [],
    currentlyEditing: null,
  };
}

describe('PageDetailComponent in create mode', () => {
  let component: PageDetailComponent;
  let pageService: jasmine.SpyObj<PageService>;
  let editingService: jasmine.SpyObj<PageEditingService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let projectFilter: ProjectFilterStub;

  function createComponent(queryParams: Record<string, string> = {}) {
    const route = {
      paramMap: of(convertToParamMap({})),
      snapshot: {queryParamMap: convertToParamMap(queryParams)},
    } as unknown as ActivatedRoute;
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');

    component = new PageDetailComponent(
      route,
      pageService,
      editingService,
      teamService,
      {} as AuthService,
      navigationService,
      jasmine.createSpyObj<FavoriteService>('FavoriteService', ['forgetItem', 'renameItem']),
      jasmine.createSpyObj<ToastService>('ToastService', ['show']),
      projectFilter.service,
      {instant: (key: string) => key} as unknown as TranslateService,
    );
    component.ngOnInit();
  }

  beforeEach(() => {
    pageService = jasmine.createSpyObj<PageService>('PageService', ['get', 'create']);
    editingService = jasmine.createSpyObj<PageEditingService>('PageEditingService', ['connect', 'disconnect', 'startEditing', 'stopEditing']);
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate']);
    projectFilter = projectFilterStub(4);
  });

  it('makes no request and opens no editing channel until Create', () => {
    createComponent();

    expect(component.mode).toBe('create');
    expect(pageService.get).not.toHaveBeenCalled();
    expect(pageService.create).not.toHaveBeenCalled();
    expect(editingService.connect).not.toHaveBeenCalled();
    expect(component.draftProjectId).toBe(4);
  });

  it('creates with the drafts and folder, then goes back to the list', fakeAsync(() => {
    pageService.create.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
    createComponent({folder: '3'});
    component.draftTitle = 'Plan';
    component.handleContentChange('<p>Hi</p>');

    component.handleCreate();
    expect(component.isCreating).toBeTrue();
    tick();

    expect(pageService.create).toHaveBeenCalledOnceWith('abc', {title: 'Plan', content: '<p>Hi</p>', projectId: 4, folderId: 3});
    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES);
    expect(component.isCreating).toBeFalse();
  }));

  it('uses the untitled title when the title is empty', fakeAsync(() => {
    pageService.create.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
    createComponent();

    component.handleCreate();
    tick();

    expect(pageService.create).toHaveBeenCalledOnceWith('abc', {title: 'UNTITLED_PAGE', content: '', projectId: 4, folderId: null});
  }));

  it('keeps the popup open with the draft when Create fails', fakeAsync(() => {
    pageService.create.and.returnValue(Promise.resolve({success: false, code: 'PAGE_CREATE_FAILED'}));
    createComponent();
    component.draftTitle = 'Plan';

    component.handleCreate();
    tick();

    expect(navigationService.navigate).not.toHaveBeenCalled();
    expect(component.alertMessage).toBe(errorPhrase('PAGE_CREATE_FAILED'));
    expect(component.draftTitle).toBe('Plan');
    expect(component.isCreating).toBeFalse();
  }));

  it('closes an untouched draft right away', () => {
    createComponent();

    component.handleCancel();

    expect(component.showDiscardConfirm).toBeFalse();
    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES);
  });

  it('asks before discarding a changed draft', () => {
    createComponent();
    component.draftTitle = 'Plan';

    component.handleClose();

    expect(component.showDiscardConfirm).toBeTrue();
    expect(navigationService.navigate).not.toHaveBeenCalled();

    component.handleCancelDiscard();
    expect(component.showDiscardConfirm).toBeFalse();
    expect(component.draftTitle).toBe('Plan');

    component.handleCancel();
    component.handleConfirmDiscard();
    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES);
    expect(pageService.create).not.toHaveBeenCalled();
  });

  it('treats a changed project as a change', () => {
    createComponent();

    component.handleDraftProjectChange(null);
    component.handleCancel();

    expect(component.showDiscardConfirm).toBeTrue();
  });
});
