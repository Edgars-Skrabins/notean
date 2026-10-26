import {fakeAsync, tick} from "@angular/core/testing";
import {Router} from "@angular/router";
import {DocumentPagesComponent} from "./document-pages.component";
import {PageService} from "@services/page.service";
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {FavoriteService} from "@services/favorite.service";
import {FolderSummary} from "@models/folder.model";
import {FolderedItemDetail} from "@models/foldered-item.model";
import {projectFilterStub, ProjectFilterStub} from "../../../testing/projectFilterStub";
import {errorPhrase} from "@utils/errorPhrase";

function folder(id: number, parentId: number | null, title = `Folder ${id}`): FolderSummary {
  return {id, title, parentId, projectId: null, creator: {id: 1, nickname: 'alice'}, createdAt: '', updatedAt: ''};
}

function page(id: number, folderId: number | null, title = `Page ${id}`): FolderedItemDetail {
  return {
    id,
    title,
    folderId,
    projectId: null,
    lockVersion: 0,
    creator: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}},
    createdAt: '',
    updatedAt: '',
    content: '',
    contributors: [],
    currentlyEditing: null,
  };
}

describe('DocumentPagesComponent', () => {
  let component: DocumentPagesComponent;
  let pageService: jasmine.SpyObj<PageService>;
  let folderService: jasmine.SpyObj<FolderService>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let projectFilter: ProjectFilterStub;
  let router: jasmine.SpyObj<Router>;

  beforeEach(fakeAsync(() => {
    projectFilter = projectFilterStub();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    pageService = jasmine.createSpyObj<PageService>('PageService', ['list', 'moveToFolder', 'delete', 'create', 'rename']);
    folderService = jasmine.createSpyObj<FolderService>('FolderService', ['listFolders', 'createFolder', 'renameFolder', 'moveFolder', 'deleteFolder', 'setFolderProject']);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['forgetItem', 'renameItem']);
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    folderService.listFolders.and.returnValue(Promise.resolve({success: true, folders: [folder(1, null), folder(2, 1), folder(3, 2)]}));
    pageService.list.and.returnValue(Promise.resolve({
      success: true,
      items: [page(10, 1, 'Roadmap'), page(11, 3, 'Release notes'), page(12, null, 'Ideas')],
    }));

    component = new DocumentPagesComponent(
      pageService,
      folderService,
      teamService,
      favoriteService,
      router,
      projectFilter.service,
    );
    component.ngOnInit();
    tick();
  }));

  function expectNoReload() {
    expect(folderService.listFolders).toHaveBeenCalledTimes(1);
    expect(pageService.list).toHaveBeenCalledTimes(1);
  }

  it('loads folders and pages once', () => {
    expect(component.folders.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(component.items.map((item) => item.id)).toEqual([10, 11, 12]);
    expectNoReload();
  });

  it('adds a created folder without reloading', fakeAsync(() => {
    folderService.createFolder.and.returnValue(Promise.resolve({success: true, folder: folder(4, null, 'New')}));
    component.handleCreateFolder(null);

    component.handleCreateFolderConfirmed({title: 'New', projectId: 7});
    tick();

    expect(folderService.createFolder).toHaveBeenCalledWith('abc', 'Page', 'New', null, 7);
    expect(component.folders.map((item) => item.id)).toEqual([1, 2, 3, 4]);
    expectNoReload();
  }));

  it('replaces a renamed or moved folder without reloading', fakeAsync(() => {
    folderService.renameFolder.and.returnValue(Promise.resolve({success: true, folder: folder(2, 1, 'Renamed')}));
    folderService.moveFolder.and.returnValue(Promise.resolve({success: true, folder: folder(3, null)}));

    component.handleRenameFolder({folderId: 2, title: 'Renamed'});
    component.handleMoveFolder({folderId: 3, parentId: null});
    tick();

    expect(component.folders.find((item) => item.id === 2)?.title).toBe('Renamed');
    expect(component.folders.find((item) => item.id === 3)?.parentId).toBeNull();
    expectNoReload();
  }));

  it('changing a folder project updates its subtree without reloading', fakeAsync(() => {
    folderService.setFolderProject.and.returnValue(Promise.resolve({success: true, folder: {...folder(1, null), projectId: 7}}));

    component.handleChangeFolderProject({folderId: 1});
    component.handleFolderProjectConfirmed({projectId: 7});
    tick();

    expect(folderService.setFolderProject).toHaveBeenCalledWith('abc', 1, 7);
    expect(component.folderPendingProjectChange).toBeNull();
    expect(component.folders.map((item) => item.projectId)).toEqual([7, 7, 7]);
    expect(component.items.map((item) => [item.id, item.projectId])).toEqual([[10, 7], [11, 7], [12, null]]);
    expectNoReload();
  }));

  it('removes a folder subtree that moves out of the selected project', fakeAsync(() => {
    projectFilter.selected.next(5);
    tick();
    folderService.setFolderProject.and.returnValue(Promise.resolve({success: true, folder: {...folder(2, 1), projectId: 7}}));

    component.handleChangeFolderProject({folderId: 2});
    component.handleFolderProjectConfirmed({projectId: 7});
    tick();

    expect(component.folders.map((item) => item.id)).toEqual([1]);
    expect(component.items.map((item) => item.id)).toEqual([10, 12]);
  }));

  it('gives a moved folder subtree its new parent project', fakeAsync(() => {
    folderService.moveFolder.and.returnValue(Promise.resolve({success: true, folder: {...folder(3, 1), projectId: 7}}));

    component.handleMoveFolder({folderId: 3, parentId: 1});
    tick();

    expect(component.folders.find((item) => item.id === 3)?.projectId).toBe(7);
    expect(component.items.find((item) => item.id === 11)?.projectId).toBe(7);
  }));

  it('moves and deletes pages without reloading', fakeAsync(() => {
    pageService.moveToFolder.and.returnValue(Promise.resolve({success: true, item: page(12, 2, 'Ideas')}));
    pageService.delete.and.returnValue(Promise.resolve({success: true}));

    component.handleMoveItem({itemId: 12, folderId: 2});
    component.handleDeleteItem({itemId: 10});
    tick();

    expect(component.items.find((item) => item.id === 12)?.folderId).toBe(2);
    expect(component.items.map((item) => item.id)).toEqual([11, 12]);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Page', 10);
    expectNoReload();
  }));

  it('renames a page and its favorites without reloading', fakeAsync(() => {
    pageService.rename.and.returnValue(Promise.resolve({success: true, item: page(12, null, 'Big ideas')}));

    component.handleRenameItem({itemId: 12, title: 'Big ideas'});
    tick();

    expect(pageService.rename).toHaveBeenCalledWith('abc', 12, 'Big ideas', 0);
    expect(component.items.find((item) => item.id === 12)?.title).toBe('Big ideas');
    expect(favoriteService.renameItem).toHaveBeenCalledWith('Page', 12, 'Big ideas');
    expect(component.alertMessage).toBe('');
    expectNoReload();
  }));

  it('shows the latest page and the conflict error when a rename conflicts', fakeAsync(() => {
    pageService.rename.and.returnValue(Promise.resolve({success: false, code: 'EDIT_CONFLICT', latest: {...page(12, null, 'Their title'), lockVersion: 4}}));

    component.handleRenameItem({itemId: 12, title: 'Big ideas'});
    tick();

    const renamed = component.items.find((item) => item.id === 12);
    expect([renamed?.title, renamed?.lockVersion]).toEqual(['Their title', 4]);
    expect(favoriteService.renameItem).toHaveBeenCalledWith('Page', 12, 'Their title');
    expect(component.alertMessage).toBe(errorPhrase('EDIT_CONFLICT'));
    expectNoReload();
  }));

  it('keeps the old title and shows the error when a rename fails', fakeAsync(() => {
    pageService.rename.and.returnValue(Promise.resolve({success: false, code: 'PAGE_NOT_FOUND'}));

    component.handleRenameItem({itemId: 12, title: 'Big ideas'});
    tick();

    expect(component.items.find((item) => item.id === 12)?.title).toBe('Ideas');
    expect(component.alertMessage).toBe(errorPhrase('PAGE_NOT_FOUND'));
    expect(favoriteService.renameItem).not.toHaveBeenCalled();
  }));

  it('cascade delete removes the folder subtree and its pages', fakeAsync(() => {
    folderService.deleteFolder.and.returnValue(Promise.resolve({success: true}));

    component.handleDeleteFolder({folderId: 2, mode: 'cascade'});
    tick();

    expect(component.folders.map((item) => item.id)).toEqual([1]);
    expect(component.items.map((item) => item.id)).toEqual([10, 12]);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Page', 11);
    expectNoReload();
  }));

  it('promote delete moves the contents up a level', fakeAsync(() => {
    folderService.deleteFolder.and.returnValue(Promise.resolve({success: true}));

    component.handleDeleteFolder({folderId: 1, mode: 'promote'});
    tick();

    expect(component.folders.map((item) => [item.id, item.parentId])).toEqual([[2, null], [3, 2]]);
    expect(component.items.find((item) => item.id === 10)?.folderId).toBeNull();
    expect(favoriteService.forgetItem).not.toHaveBeenCalled();
    expectNoReload();
  }));

  it('filters pages by title in the browser while searching', () => {
    component.searchQuery = ' NOTES ';

    expect(component.displayItems.map((item) => [item.id, item.folderId])).toEqual([[11, null]]);
    expect(component.displayFolders).toEqual([]);
    expectNoReload();
  });

  it('reloads folders and pages for the newly selected project', fakeAsync(() => {
    projectFilter.selected.next(4);
    tick();

    expect(folderService.listFolders).toHaveBeenCalledWith('abc', 'Page', 4);
    expect(pageService.list).toHaveBeenCalledWith('abc', 4);
  }));

  it('opens create mode without calling the API', () => {
    component.handleCreateItem(null);

    expect(pageService.create).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['dashboard', 'pages', 'new'], {queryParams: {}});
  });

  it('passes the folder to create mode', () => {
    component.handleCreateItem(3);

    expect(router.navigate).toHaveBeenCalledOnceWith(['dashboard', 'pages', 'new'], {queryParams: {folder: 3}});
  });
});
