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
import {FolderService} from "@services/folder.service";
import {CopyLinkService} from "@services/copy-link.service";
import {TemplateService} from "@services/template.service";
import {AttachmentService} from "@services/attachment.service";
import {Attachment} from "@models/attachment.model";
import {FolderedItemDetail} from "@models/foldered-item.model";
import {errorPhrase} from "@utils/errorPhrase";
import {projectFilterStub, ProjectFilterStub} from "../../../testing/projectFilterStub";
import {AppRoutes} from "../../../app/app-routes.enum";
import {PageDetailComponent} from "./page-detail.component";
import {trashServiceStub} from "../../../testing/trashServiceStub";

function createdPage(): FolderedItemDetail {
  return {
    id: 9,
    title: 'Plan',
    folderId: 3,
    projectId: 4,
    lockVersion: 0,
    creator: {id: 1, nickname: 'alice', avatar: {color: 'blue', imageUrl: null}},
    createdAt: '',
    updatedAt: '',
    content: '<p>Hi</p>',
    contributors: [],
    currentlyEditing: null,
    attachments: [],
  };
}

describe('PageDetailComponent', () => {
  let component: PageDetailComponent;
  let pageService: jasmine.SpyObj<PageService>;
  let editingService: jasmine.SpyObj<PageEditingService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let projectFilter: ProjectFilterStub;
  let folderService: jasmine.SpyObj<FolderService>;
  let copyLinkService: jasmine.SpyObj<CopyLinkService>;
  let templateService: jasmine.SpyObj<TemplateService>;
  let attachmentService: jasmine.SpyObj<AttachmentService>;

  function createComponent(queryParams: Record<string, string> = {}, params: Record<string, string> = {}) {
    const route = {
      paramMap: of(convertToParamMap(params)),
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
      folderService,
      {instant: (key: string) => key} as unknown as TranslateService,
      copyLinkService,
      trashServiceStub().service,
      attachmentService,
      templateService,
    );
    component.ngOnInit();
  }

  beforeEach(() => {
    pageService = jasmine.createSpyObj<PageService>('PageService', ['get', 'create', 'save', 'setProject']);
    editingService = jasmine.createSpyObj<PageEditingService>('PageEditingService', ['connect', 'disconnect', 'startEditing', 'stopEditing']);
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate', 'navigateWithState', 'navigateReplacingUrl']);
    copyLinkService = jasmine.createSpyObj<CopyLinkService>('CopyLinkService', ['copyCurrentLink']);
    projectFilter = projectFilterStub(4);
    folderService = jasmine.createSpyObj<FolderService>('FolderService', ['listFolders']);
    templateService = jasmine.createSpyObj<TemplateService>('TemplateService', ['resolve']);
    attachmentService = jasmine.createSpyObj<AttachmentService>('AttachmentService', ['uploadPending', 'uploadToPage', 'deletePending', 'deleteFromPage']);
    attachmentService.deletePending.and.returnValue(Promise.resolve({success: true}));
    folderService.listFolders.and.returnValue(Promise.resolve({
      success: true,
      folders: [{id: 3, title: 'Plans', parentId: null, projectId: 8, creator: {id: 1, nickname: 'alice'}, createdAt: '', updatedAt: ''}],
    }));
  });

  it('makes no request and opens no editing channel until Create', () => {
    createComponent();

    expect(component.mode).toBe('create');
    expect(pageService.get).not.toHaveBeenCalled();
    expect(pageService.create).not.toHaveBeenCalled();
    expect(editingService.connect).not.toHaveBeenCalled();
    expect(component.draftProjectId).toBe(4);
  });

  it('creates with the drafts and folder, then goes back to the list with the created item', fakeAsync(() => {
    pageService.create.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
    createComponent({folder: '3'});
    tick();
    component.draftTitle = 'Plan';
    component.handleContentChange('<p>Hi</p>');

    component.handleCreate();
    expect(component.isCreating).toBeTrue();
    tick();

    expect(pageService.create).toHaveBeenCalledOnceWith('abc', {title: 'Plan', content: '<p>Hi</p>', projectId: 8, folderId: 3, attachmentIds: []});
    const createdItem = {id: 9, title: 'Plan', folderId: 3, projectId: 4, lockVersion: 0, creator: createdPage().creator, createdAt: '', updatedAt: ''};
    expect(navigationService.navigateWithState).toHaveBeenCalledOnceWith({createdItem}, AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES);
    expect(component.isCreating).toBeFalse();
  }));

  it('prefills the content from a template and keeps the folder and the untitled title', fakeAsync(() => {
    templateService.resolve.and.returnValue(Promise.resolve({success: true, content: '<h1>Agenda</h1>'}));
    pageService.create.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
    createComponent({template: 'builtin:meeting-notes', folder: '3'});

    expect(component.isLoading).toBeTrue();

    tick();

    expect(component.isLoading).toBeFalse();

    expect(templateService.resolve).toHaveBeenCalledWith('abc', 'page', 'builtin:meeting-notes');
    expect(component.draftContent).toBe('<h1>Agenda</h1>');
    expect(component.draftTitle).toBe('');
    expect(component.hasCreateDraftChanges).toBeTrue();

    component.handleCreate();
    tick();

    expect(pageService.create).toHaveBeenCalledWith('abc', jasmine.objectContaining({content: '<h1>Agenda</h1>', folderId: 3}));
  }));

  it('opens a blank draft with the error when the template cannot be loaded', fakeAsync(() => {
    templateService.resolve.and.returnValue(Promise.resolve({success: false, code: 'TEMPLATE_NOT_FOUND'}));
    createComponent({template: '12'});
    tick();

    expect(component.mode).toBe('create');
    expect(component.draftContent).toBe('');
    expect(component.alertMessage).toBe(errorPhrase('TEMPLATE_NOT_FOUND'));
  }));

  it('takes the project of the folder it is created in and locks it', fakeAsync(() => {
    createComponent({folder: '3'});
    tick();

    expect(folderService.listFolders).toHaveBeenCalledOnceWith('abc', 'Page');
    expect(component.draftProjectId).toBe(8);
    expect(component.isProjectSetByFolder).toBeTrue();
    expect(component.hasCreateDraftChanges).toBeFalse();
  }));

  it('keeps the project editable when created at the top level', () => {
    createComponent();

    expect(folderService.listFolders).not.toHaveBeenCalled();
    expect(component.isProjectSetByFolder).toBeFalse();
  });

  it('locks the project of an existing item that is in a folder', fakeAsync(() => {
    pageService.get.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
    createComponent({}, {id: '9'});
    tick();

    expect(component.isProjectSetByFolder).toBeTrue();
  }));

  it('uses the untitled title when the title is empty', fakeAsync(() => {
    pageService.create.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
    createComponent();

    component.handleCreate();
    tick();

    expect(pageService.create).toHaveBeenCalledOnceWith('abc', {title: 'UNTITLED_PAGE', content: '', projectId: 4, folderId: null, attachmentIds: []});
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

  it('sends a missing or hidden page to the unavailable screen', fakeAsync(() => {
    pageService.get.and.returnValue(Promise.resolve({success: false, code: 'PAGE_NOT_FOUND'}));
    createComponent({}, {id: '9'});
    tick();

    expect(navigationService.navigateReplacingUrl).toHaveBeenCalledOnceWith(AppRoutes.UNAVAILABLE);
  }));

  it('keeps other load errors in the popup', fakeAsync(() => {
    pageService.get.and.returnValue(Promise.resolve({success: false, code: 'NETWORK_ERROR'}));
    createComponent({}, {id: '9'});
    tick();

    expect(navigationService.navigateReplacingUrl).not.toHaveBeenCalled();
    expect(component.alertMessage).toBe(errorPhrase('NETWORK_ERROR'));
  }));

  describe('on Escape', () => {
    function openPage() {
      pageService.get.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
      createComponent({}, {id: '9'});
      tick();
    }

    it('closes the popup in view mode', fakeAsync(() => {
      openPage();

      component.handleEscape();

      expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES);
    }));

    it('returns to view mode when editing without changes', fakeAsync(() => {
      openPage();
      component.handleEdit();

      component.handleEscape();

      expect(component.mode).toBe('view');
      expect(component.showDiscardConfirm).toBeFalse();
      expect(editingService.stopEditing).toHaveBeenCalled();
      expect(navigationService.navigate).not.toHaveBeenCalled();
    }));

    it('asks before discarding edits, and keeps editing when the question is cancelled', fakeAsync(() => {
      openPage();
      component.handleEdit();
      component.handleContentChange('<p>Changed</p>');

      component.handleEscape();
      expect(component.mode).toBe('edit');
      expect(component.showDiscardConfirm).toBeTrue();

      component.handleCancelDiscard();
      expect(component.mode).toBe('edit');
      expect(component.draftContent).toBe('<p>Changed</p>');
    }));

    it('discards edits and stays in the popup in view mode when confirmed', fakeAsync(() => {
      openPage();
      component.handleEdit();
      component.draftTitle = 'Renamed';

      component.handleEscape();
      component.handleConfirmDiscard();

      expect(component.mode).toBe('view');
      expect(component.showDiscardConfirm).toBeFalse();
      expect(component.item?.title).toBe('Plan');
      expect(editingService.stopEditing).toHaveBeenCalled();
      expect(navigationService.navigate).not.toHaveBeenCalled();
    }));

    it('closes an untouched draft in create mode', () => {
      createComponent();

      component.handleEscape();

      expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES);
    });

    it('asks before discarding a changed draft in create mode', () => {
      createComponent();
      component.draftTitle = 'Plan';

      component.handleEscape();

      expect(component.showDiscardConfirm).toBeTrue();
      expect(navigationService.navigate).not.toHaveBeenCalled();
    });
  });

  describe('on an edit conflict', () => {
    const latest = {...createdPage(), title: 'Their plan', content: '<p>Theirs</p>', lockVersion: 2};

    function editAndSaveIntoConflict() {
      pageService.get.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
      pageService.save.and.returnValue(Promise.resolve({success: false, code: 'EDIT_CONFLICT', latest}));
      createComponent({}, {id: '9'});
      tick();
      component.handleEdit();
      component.handleContentChange('<p>Mine</p>');
      component.handleSave();
      tick();
    }

    it('saves with the loaded version and opens the dialog with the latest item', fakeAsync(() => {
      editAndSaveIntoConflict();

      expect(pageService.save).toHaveBeenCalledOnceWith('abc', 9, {title: 'Plan', content: '<p>Mine</p>', lockVersion: 0});
      expect(component.editConflict).toEqual(latest);
      expect(component.mode).toBe('edit');
    }));

    it('shows the latest item and leaves edit mode on Load latest', fakeAsync(() => {
      editAndSaveIntoConflict();

      component.handleConflictLoadLatest();

      expect(component.editConflict).toBeNull();
      expect(component.item).toEqual(latest);
      expect(component.mode).toBe('view');
      expect(editingService.stopEditing).toHaveBeenCalled();
    }));

    it('resends the draft with the latest version on Overwrite', fakeAsync(() => {
      editAndSaveIntoConflict();
      const saved = {...createdPage(), content: '<p>Mine</p>', lockVersion: 3};
      pageService.save.and.returnValue(Promise.resolve({success: true, item: saved}));

      component.handleConflictOverwrite();
      tick();

      expect(pageService.save).toHaveBeenCalledWith('abc', 9, {title: 'Plan', content: '<p>Mine</p>', lockVersion: 2});
      expect(component.editConflict).toBeNull();
      expect(component.item).toEqual(saved);
      expect(component.mode).toBe('view');
    }));

    it('keeps the draft in edit mode when the dialog is closed', fakeAsync(() => {
      editAndSaveIntoConflict();

      component.handleConflictCancel();

      expect(component.editConflict).toBeNull();
      expect(component.mode).toBe('edit');
      expect(component.draftContent).toBe('<p>Mine</p>');
      expect(component.item?.content).toBe('<p>Hi</p>');
    }));
  });

  it('keeps the version from a project change for the next save', fakeAsync(() => {
    pageService.get.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
    pageService.setProject.and.returnValue(Promise.resolve({success: true, item: {...createdPage(), projectId: 5, lockVersion: 1}}));
    createComponent({}, {id: '9'});
    tick();

    component.handleProjectChange(5);
    tick();

    expect(component.item?.lockVersion).toBe(1);
  }));

  describe('attachments', () => {
    function attachment(id: number, kind: 'file' | 'inline' = 'file'): Attachment {
      return {id, filename: `file${id}`, contentType: 'text/plain', byteSize: 1, kind, uploader: {id: 1, nickname: 'alice', avatar: {color: 'blue', imageUrl: null}}, createdAt: ''};
    }

    it('uploads files as pending before Create and sends their ids with it', fakeAsync(() => {
      attachmentService.uploadPending.and.returnValue(Promise.resolve({success: true, attachment: attachment(5)}));
      pageService.create.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
      createComponent();

      component.uploadFiles([new File(['x'], 'a.txt')]);
      tick();
      expect(attachmentService.uploadPending).toHaveBeenCalledWith('abc', jasmine.any(File), 'file', jasmine.any(Function));
      expect(component.attachments.map((item) => item.id)).toEqual([5]);
      expect(component.hasCreateDraftChanges).toBeTrue();

      component.handleCreate();
      tick();
      component.ngOnDestroy();

      expect(pageService.create.calls.mostRecent().args[1].attachmentIds).toEqual([5]);
      expect(attachmentService.deletePending).not.toHaveBeenCalled();
    }));

    it('deletes pending uploads when the new page is discarded', fakeAsync(() => {
      attachmentService.uploadPending.and.returnValues(
        Promise.resolve({success: true, attachment: attachment(5)}),
        Promise.resolve({success: true, attachment: attachment(6, 'inline')}),
      );
      createComponent();
      component.uploadFiles([new File(['x'], 'a.txt')]);
      tick();
      component.uploadImage(new File(['x'], 'a.png', {type: 'image/png'}));
      tick();

      component.ngOnDestroy();

      expect(attachmentService.deletePending.calls.allArgs()).toEqual([['abc', 5], ['abc', 6]]);
    }));

    it('uploads files of an existing page straight to it', fakeAsync(() => {
      pageService.get.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
      attachmentService.uploadToPage.and.returnValue(Promise.resolve({success: true, attachment: attachment(7)}));
      createComponent({}, {id: '9'});
      tick();

      component.uploadFiles([new File(['x'], 'a.txt')]);
      tick();

      expect(attachmentService.uploadToPage).toHaveBeenCalledWith('abc', 9, jasmine.any(File), 'file', jasmine.any(Function));
      expect(component.item?.attachments.map((item) => item.id)).toEqual([7]);
    }));

    it('drops pending images that the saved content no longer uses', fakeAsync(() => {
      pageService.get.and.returnValue(Promise.resolve({success: true, item: createdPage()}));
      attachmentService.uploadPending.and.returnValues(
        Promise.resolve({success: true, attachment: attachment(11, 'inline')}),
        Promise.resolve({success: true, attachment: attachment(12, 'inline')}),
      );
      pageService.save.and.returnValue(Promise.resolve({success: true, item: {...createdPage(), content: '<img data-attachment-id="11">'}}));
      createComponent({}, {id: '9'});
      tick();
      component.handleEdit();
      component.uploadImage(new File(['x'], 'a.png', {type: 'image/png'}));
      component.uploadImage(new File(['x'], 'b.png', {type: 'image/png'}));
      tick();

      component.handleSave();
      tick();

      expect(attachmentService.deletePending.calls.allArgs()).toEqual([['abc', 12]]);
    }));

    it('leaves drops and pastes the editor already handled', () => {
      createComponent();
      const data = new DataTransfer();
      data.items.add(new File(['x'], 'a.txt'));
      const event = new DragEvent('drop', {dataTransfer: data, cancelable: true});
      event.preventDefault();

      component.handleDrop(event);

      expect(attachmentService.uploadPending).not.toHaveBeenCalled();
    });
  });
});
