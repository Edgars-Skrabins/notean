import {NO_ERRORS_SCHEMA} from "@angular/core";
import {AsyncPipe, NgIf} from "@angular/common";
import {fakeAsync, TestBed, tick} from "@angular/core/testing";
import {Router} from "@angular/router";
import {provideTranslateService, TranslatePipe} from "@ngx-translate/core";
import {DocumentPagesComponent} from "./document-pages.component";
import {PageService} from "@services/page.service";
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {FavoriteService} from "@services/favorite.service";
import {FolderSummary} from "@models/folder.model";
import {FolderedItemDetail} from "@models/foldered-item.model";
import {projectFilterStub, ProjectFilterStub} from "../../../testing/projectFilterStub";
import {errorPhrase} from "@utils/errorPhrase";
import {trashServiceStub, TrashServiceStub} from "../../../testing/trashServiceStub";
import {ProjectFilterService} from "@services/project-filter.service";
import {TrashService} from "@services/trash.service";
import {EmptyStateComponent} from "@components/empty-state/empty-state.component";
import {PHRASES} from "@config/phrases";

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
    attachments: [],
  };
}

describe('DocumentPagesComponent', () => {
  let component: DocumentPagesComponent;
  let pageService: jasmine.SpyObj<PageService>;
  let folderService: jasmine.SpyObj<FolderService>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let projectFilter: ProjectFilterStub;
  let router: jasmine.SpyObj<Router>;
  let teamService: jasmine.SpyObj<TeamService>;
  let trash: TrashServiceStub;

  beforeEach(fakeAsync(() => {
    projectFilter = projectFilterStub();
    trash = trashServiceStub();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    pageService = jasmine.createSpyObj<PageService>('PageService', ['list', 'moveToFolder', 'delete', 'create', 'rename']);
    folderService = jasmine.createSpyObj<FolderService>('FolderService', ['listFolders', 'createFolder', 'renameFolder', 'moveFolder', 'deleteFolder', 'setFolderProject']);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['forgetItem', 'renameItem']);
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    folderService.listFolders.and.returnValue(Promise.resolve({success: true, folders: [folder(1, null), folder(2, 1), folder(3, 2)]}));
    pageService.list.and.returnValue(Promise.resolve({
      success: true,
      items: [page(10, 1, 'Roadmap'), page(11, 3, 'Release notes'), page(12, null, 'Ideas')],
      hasMore: false,
    }));

    component = createComponent();
    component.ngOnInit();
    tick();
  }));

  function createComponent() {
    return new DocumentPagesComponent(
      pageService,
      folderService,
      teamService,
      favoriteService,
      router,
      projectFilter.service,
      trash.service,
    );
  }

  function expectNoReload() {
    expect(folderService.listFolders).toHaveBeenCalledTimes(1);
    expect(pageService.list).toHaveBeenCalledTimes(1);
  }

  it('loads folders and pages once', () => {
    expect(component.folders.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(component.items.map((item) => item.id)).toEqual([10, 11, 12]);
    expectNoReload();
  });

  it('loads the first root page on init', () => {
    expect(pageService.list).toHaveBeenCalledOnceWith('abc', {folderId: 'root', projectId: null});
    expect(component.levels.get('root')).toEqual({loaded: true, isLoading: false, hasMore: false});
  });

  it('loads an opened folder once and keeps what is already loaded', fakeAsync(() => {
    pageService.list.and.returnValue(Promise.resolve({success: true, items: [page(20, 2, 'Inside'), page(11, 2, 'Release notes')], hasMore: true}));

    component.handleExpandFolder({folderId: 2});
    expect(component.levels.get(2)).toEqual({loaded: false, isLoading: true, hasMore: false});
    tick();
    component.handleExpandFolder({folderId: 2});
    tick();

    expect(pageService.list).toHaveBeenCalledTimes(2);
    expect(pageService.list).toHaveBeenCalledWith('abc', {folderId: 2, projectId: null, offset: 0});
    expect(component.items.map((item) => item.id).sort()).toEqual([10, 11, 12, 20]);
    expect(component.levels.get(2)).toEqual({loaded: true, isLoading: false, hasMore: true});
  }));

  it('appends the next page of a level after the loaded items', fakeAsync(() => {
    pageService.list.and.returnValue(Promise.resolve({success: true, items: [page(30, null, 'Zebra')], hasMore: false}));

    component.handleLoadMore({level: 'root'});
    tick();

    expect(pageService.list).toHaveBeenCalledWith('abc', {folderId: 'root', projectId: null, offset: 1});
    expect(component.items.map((item) => item.id)).toEqual([10, 11, 12, 30]);
    expect(component.levels.get('root')?.hasMore).toBeFalse();
  }));

  it('keeps Load more available after a failed page', fakeAsync(() => {
    component.levels = new Map([['root', {loaded: true, isLoading: false, hasMore: true}]]);
    pageService.list.and.returnValue(Promise.resolve({success: false, code: 'NETWORK_ERROR'}));

    component.handleLoadMore({level: 'root'});
    tick();

    expect(component.alertMessage).toBe(errorPhrase('NETWORK_ERROR'));
    expect(component.levels.get('root')).toEqual({loaded: true, isLoading: false, hasMore: true});
  }));

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
    pageService.delete.and.returnValue(Promise.resolve({success: true, trashEntryIds: [1]}));

    component.handleMoveItem({itemId: 12, folderId: 2});
    component.handleDeleteItem({itemId: 10});
    tick();

    expect(component.items.find((item) => item.id === 12)?.folderId).toBe(2);
    expect(component.items.map((item) => item.id)).toEqual([11, 12]);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Page', 10);
    expect(trash.service.notifyTrashed).toHaveBeenCalledWith('abc', [1], {title: 'Roadmap'});
    expectNoReload();
  }));

  it('sends one delete for repeated presses while it runs and allows a retry after a failure', fakeAsync(() => {
    pageService.delete.and.returnValue(Promise.resolve({success: false, code: 'NETWORK_ERROR'}));

    component.handleDeleteItem({itemId: 10});
    component.handleDeleteItem({itemId: 10});
    tick();

    expect(pageService.delete).toHaveBeenCalledTimes(1);
    expect(component.items.map((item) => item.id)).toContain(10);
    expect(component.alertMessage).toBe(errorPhrase('NETWORK_ERROR'));

    component.handleDeleteItem({itemId: 10});
    expect(pageService.delete).toHaveBeenCalledTimes(2);
  }));

  it('reloads when a page or folder comes back from the trash, but not for other types', fakeAsync(() => {
    trash.restored.next([{itemType: 'Diagram', itemId: 4}]);
    tick();
    expectNoReload();

    trash.restored.next([{itemType: 'Page', itemId: 10}]);
    tick();
    expect(pageService.list).toHaveBeenCalledTimes(2);
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
    folderService.deleteFolder.and.returnValue(Promise.resolve({success: true, trashEntryIds: [1]}));

    component.handleDeleteFolder({folderId: 2, mode: 'cascade'});
    tick();

    expect(component.folders.map((item) => item.id)).toEqual([1]);
    expect(component.items.map((item) => item.id)).toEqual([10, 12]);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Page', 11);
    expect(trash.service.notifyTrashed).toHaveBeenCalledWith('abc', [1], {title: 'Folder 2'});
    expectNoReload();
  }));

  it('promote delete moves the contents up a level', fakeAsync(() => {
    folderService.deleteFolder.and.returnValue(Promise.resolve({success: true, trashEntryIds: [1]}));

    component.handleDeleteFolder({folderId: 1, mode: 'promote'});
    tick();

    expect(component.folders.map((item) => [item.id, item.parentId])).toEqual([[2, null], [3, 2]]);
    expect(component.items.find((item) => item.id === 10)?.folderId).toBeNull();
    expect(favoriteService.forgetItem).not.toHaveBeenCalled();
    expectNoReload();
  }));

  describe('search', () => {
    beforeEach(() => {
      pageService.list.and.returnValue(Promise.resolve({success: true, items: [page(11, 3, 'Release notes'), page(50, 2, 'Notes draft')], hasMore: true}));
    });

    it('asks the server once, 300 ms after typing stops', fakeAsync(() => {
      component.handleSearchChange('no');
      tick(299);
      component.handleSearchChange(' notes ');
      tick(299);
      expect(pageService.list).toHaveBeenCalledTimes(1);

      tick(1);

      expect(pageService.list).toHaveBeenCalledTimes(2);
      expect(pageService.list).toHaveBeenCalledWith('abc', {search: 'notes', projectId: null, offset: 0});
      expect(component.displayItems.map((item) => [item.id, item.folderId])).toEqual([[11, null], [50, null]]);
      expect(component.displayFolders).toEqual([]);
    }));

    it('loads more results after the ones shown', fakeAsync(() => {
      component.handleSearchChange('notes');
      tick(300);

      component.handleLoadMore({level: 'root'});
      tick();

      expect(pageService.list).toHaveBeenCalledWith('abc', {search: 'notes', projectId: null, offset: 2});
    }));

    it('reports no results only once the search has answered', fakeAsync(() => {
      pageService.list.and.returnValue(Promise.resolve({success: true, items: [], hasMore: false}));
      component.handleSearchChange('zzz');
      tick(300);

      expect(component.hasNoSearchResults).toBeTrue();
    }));

    it('returns to the tree as it was when cleared', fakeAsync(() => {
      component.handleSearchChange('notes');
      tick(300);

      component.handleSearchChange('');
      tick(300);

      expect(component.isSearching).toBeFalse();
      expect(component.displayFolders.map((item) => item.id)).toEqual([1, 2, 3]);
      expect(component.displayItems.map((item) => item.id)).toEqual([10, 11, 12]);
      expect(pageService.list).toHaveBeenCalledTimes(2);
    }));

    it('renames and deletes found items in the results', fakeAsync(() => {
      pageService.rename.and.returnValue(Promise.resolve({success: true, item: page(50, 2, 'Notes final')}));
      pageService.delete.and.returnValue(Promise.resolve({success: true, trashEntryIds: [1]}));
      component.handleSearchChange('notes');
      tick(300);

      component.handleRenameItem({itemId: 50, title: 'Notes final'});
      component.handleDeleteItem({itemId: 11});
      tick();

      expect(pageService.rename).toHaveBeenCalledWith('abc', 50, 'Notes final', 0);
      expect(component.displayItems.map((item) => item.title)).toEqual(['Notes final']);
    }));

    it('clears the search and shows the tree again', fakeAsync(() => {
      pageService.list.and.returnValue(Promise.resolve({success: true, items: [], hasMore: false}));
      component.searchQuery = 'zzz';
      component.handleSearchChange('zzz');
      tick(300);

      component.clearSearch();
      tick(300);

      expect(component.searchQuery).toBe('');
      expect(component.isSearching).toBeFalse();
      expect(component.hasNoSearchResults).toBeFalse();
      expect(component.displayItems.map((item) => item.id)).toEqual([10, 11, 12]);
    }));

    it('searches again after clearing, even for the same term', fakeAsync(() => {
      component.handleSearchChange('notes');
      tick(300);
      component.clearSearch();
      tick(300);

      component.handleSearchChange('notes');
      tick(300);

      expect(pageService.list).toHaveBeenCalledTimes(3);
    }));
  });

  it('reloads folders and pages for the newly selected project', fakeAsync(() => {
    projectFilter.selected.next(4);
    tick();

    expect(folderService.listFolders).toHaveBeenCalledWith('abc', 'Page', 4);
    expect(pageService.list).toHaveBeenCalledWith('abc', {folderId: 'root', projectId: 4});
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

  it('opens the template picker for From template and creates in the folder from the picked template', () => {
    component.handleCreateItem(3, true);

    expect(component.isTemplatePickerOpen).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();

    component.handleTemplatePicked('builtin:concept');

    expect(component.isTemplatePickerOpen).toBeFalse();
    expect(router.navigate).toHaveBeenCalledOnceWith(['dashboard', 'pages', 'new'], {queryParams: {template: 'builtin:concept', folder: 3}});
  });

  it('creates at the top level from a template picked in the toolbar menu', () => {
    component.handleCreateChoice('template');
    component.handleTemplatePicked('4');

    expect(router.navigate).toHaveBeenCalledOnceWith(['dashboard', 'pages', 'new'], {queryParams: {template: '4'}});
  });
  it('shows all projects by clearing the project selector', () => {
    projectFilter.selected.next(4);

    component.showAllProjects();

    expect(projectFilter.selected.value).toBeNull();
  });

  it('names the selected project only when it is known', () => {
    expect(component.selectedProjectName).toBeNull();

    projectFilter.projects.next([{id: 4, name: 'Apollo'}]);
    projectFilter.selected.next(4);
    expect(component.selectedProjectName).toBe('Apollo');

    projectFilter.selected.next(5);
    expect(component.selectedProjectName).toBeNull();
  });

  it('browses the page templates', () => {
    component.handleBrowseTemplates();

    expect(router.navigate).toHaveBeenCalledOnceWith(['dashboard', 'pages', 'templates']);
  });
});

describe('DocumentPagesComponent empty states', () => {
  let projectFilter: ProjectFilterStub;

  async function render(items: FolderedItemDetail[], projectId: number | null = null) {
    projectFilter = projectFilterStub(projectId);
    projectFilter.projects.next([{id: 4, name: 'Apollo'}]);
    const pageService = jasmine.createSpyObj<PageService>('PageService', ['list']);
    pageService.list.and.returnValue(Promise.resolve({success: true, items, hasMore: false}));
    const folderService = jasmine.createSpyObj<FolderService>('FolderService', ['listFolders']);
    folderService.listFolders.and.returnValue(Promise.resolve({success: true, folders: []}));
    TestBed.configureTestingModule({
      imports: [DocumentPagesComponent],
      providers: [
        provideTranslateService(),
        {provide: PageService, useValue: pageService},
        {provide: FolderService, useValue: folderService},
        {provide: TeamService, useValue: {getCurrentTeamCode: () => 'abc'}},
        {provide: FavoriteService, useValue: {}},
        {provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate', 'getCurrentNavigation'])},
        {provide: ProjectFilterService, useValue: projectFilter.service},
        {provide: TrashService, useValue: trashServiceStub().service},
      ],
    }).overrideComponent(DocumentPagesComponent, {set: {imports: [NgIf, AsyncPipe, TranslatePipe, EmptyStateComponent], schemas: [NO_ERRORS_SCHEMA]}});
    const fixture = TestBed.createComponent(DocumentPagesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function title(fixture: {nativeElement: HTMLElement}): string | null {
    return fixture.nativeElement.querySelector('.emptyState__title')?.textContent ?? null;
  }

  it('teaches first use when there are no pages at all', async () => {
    const fixture = await render([]);

    expect(title(fixture)).toBe(PHRASES.EMPTY_PAGES_TITLE);
    expect(fixture.nativeElement.querySelector('.emptyState__hint')?.textContent).toBe(PHRASES.EMPTY_PAGES_HINT);
  });

  it('names the selected project when it has no pages', async () => {
    const fixture = await render([], 4);

    expect(title(fixture)).toBe(PHRASES.EMPTY_PAGES_IN_PROJECT_TITLE);
  });

  it('shows no empty state while there are pages', async () => {
    const fixture = await render([page(10, null)]);

    expect(title(fixture)).toBeNull();
  });
});
