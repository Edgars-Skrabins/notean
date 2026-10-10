import {fakeAsync, tick} from "@angular/core/testing";
import {Router} from "@angular/router";
import {TranslateService} from "@ngx-translate/core";
import {DocumentPagesComponent} from "./document-pages.component";
import {PageService} from "@services/page.service";
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {FavoriteService} from "@services/favorite.service";
import {FolderSummary} from "@models/folder.model";
import {FolderedItemDetail} from "@models/foldered-item.model";

function folder(id: number, parentId: number | null, title = `Folder ${id}`): FolderSummary {
  return {id, title, parentId, creator: {id: 1, nickname: 'alice'}, createdAt: '', updatedAt: ''};
}

function page(id: number, folderId: number | null, title = `Page ${id}`): FolderedItemDetail {
  return {
    id,
    title,
    folderId,
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

  beforeEach(fakeAsync(() => {
    pageService = jasmine.createSpyObj<PageService>('PageService', ['list', 'moveToFolder', 'delete', 'create']);
    folderService = jasmine.createSpyObj<FolderService>('FolderService', ['listFolders', 'createFolder', 'renameFolder', 'moveFolder', 'deleteFolder']);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['forgetItem']);
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
      {} as Router,
      {} as TranslateService,
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

    component.handleCreateFolderConfirmed({title: 'New'});
    tick();

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
});
