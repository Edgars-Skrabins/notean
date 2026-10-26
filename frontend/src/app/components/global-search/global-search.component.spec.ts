import {ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick} from '@angular/core/testing';
import {Router} from '@angular/router';
import {provideTranslateService} from '@ngx-translate/core';
import {GlobalSearchComponent, SEARCH_DEBOUNCE_MS} from './global-search.component';
import {SearchService} from '@services/search.service';
import {TeamService} from '@services/team.service';
import {ProjectFilterService} from '@services/project-filter.service';
import {SearchMoreResponse, SearchResponse, SearchResult, SearchResultType, SearchSection} from '@models/search.model';
import {splitSnippet} from '@utils/splitSnippet';
import {AppRoutes} from '../../app/app-routes.enum';
import {projectFilterStub, ProjectFilterStub} from '../../testing/projectFilterStub';

function result(type: SearchResultType, id: number, extra: Partial<SearchResult> = {}): SearchResult {
  return {type, id, title: `${type} ${id}`, updatedAt: '', projectName: null, snippet: null, ...extra};
}

function section(type: SearchResultType, results: SearchResult[], hasMore = false): SearchSection {
  return {type, results, hasMore};
}

function found(...sections: SearchSection[]): SearchResponse {
  return {success: true, sections};
}

describe('GlobalSearchComponent', () => {
  let fixture: ComponentFixture<GlobalSearchComponent>;
  let component: GlobalSearchComponent;
  let searchService: jasmine.SpyObj<SearchService>;
  let router: jasmine.SpyObj<Router>;
  let projectFilter: ProjectFilterStub;

  function type(value: string) {
    component.handleInput(value);
    tick(SEARCH_DEBOUNCE_MS);
    flushMicrotasks();
  }

  function keydown(target: HTMLElement, key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true});
    target.dispatchEvent(event);
    return event;
  }

  beforeEach(async () => {
    projectFilter = projectFilterStub();
    searchService = jasmine.createSpyObj<SearchService>('SearchService', ['search', 'searchMore']);
    searchService.search.and.returnValue(Promise.resolve(found()));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');

    await TestBed.configureTestingModule({
      imports: [GlobalSearchComponent],
      providers: [
        provideTranslateService(),
        {provide: SearchService, useValue: searchService},
        {provide: TeamService, useValue: teamService},
        {provide: Router, useValue: router},
        {provide: ProjectFilterService, useValue: projectFilter.service},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sends no request for whitespace only', fakeAsync(() => {
    type('   ');

    expect(searchService.search).not.toHaveBeenCalled();
    expect(component.isOpen).toBeFalse();
  }));

  it('searches from the first character', fakeAsync(() => {
    type(' r ');

    expect(searchService.search).toHaveBeenCalledOnceWith('abc', 'r', null);
  }));

  it('searches once after typing stops', fakeAsync(() => {
    component.handleInput('ro');
    tick(100);
    component.handleInput('roc');
    tick(SEARCH_DEBOUNCE_MS);
    flushMicrotasks();

    expect(searchService.search).toHaveBeenCalledOnceWith('abc', 'roc', null);
  }));

  it('only shows the latest query results', fakeAsync(() => {
    let resolveFirst!: (response: SearchResponse) => void;
    searchService.search.and.returnValues(
      new Promise((resolve) => resolveFirst = resolve),
      Promise.resolve(found(section('page', [result('page', 2)]))),
    );

    type('rock');
    type('rocket');
    resolveFirst(found(section('page', [result('page', 1)])));
    flushMicrotasks();

    expect(component.sections[0].results.map((item) => item.id)).toEqual([2]);
  }));

  it('sends the selected project, or none when including all projects, and resets on close', fakeAsync(() => {
    projectFilter.selected.next(7);
    projectFilter.projects.next([{id: 7, name: 'Game'} as never]);

    type('rocket');
    expect(searchService.search).toHaveBeenCalledWith('abc', 'rocket', 7);
    expect(component.selectedProjectName).toBe('Game');

    component.handleIncludeAllProjects();
    flushMicrotasks();
    expect(searchService.search).toHaveBeenCalledWith('abc', 'rocket', null);
    expect(component.selectedProjectName).toBeNull();

    component.close();
    expect(component.includeAllProjects).toBeFalse();
    component.handleFocus();
    flushMicrotasks();
    expect(searchService.search.calls.mostRecent().args).toEqual(['abc', 'rocket', 7]);
  }));

  it('appends more results with the right offset', fakeAsync(() => {
    const pages = section('page', [1, 2, 3, 4, 5].map((id) => result('page', id)), true);
    searchService.search.and.returnValue(Promise.resolve(found(pages)));
    const more: SearchMoreResponse = {success: true, section: section('page', [result('page', 6)], false)};
    searchService.searchMore.and.returnValue(Promise.resolve(more));

    type('rocket');
    component.showMore(component.sections[0]);
    flushMicrotasks();

    expect(searchService.searchMore).toHaveBeenCalledOnceWith('abc', 'rocket', null, 'page', 5);
    expect(component.sections[0].results.map((item) => item.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(component.sections[0].hasMore).toBeFalse();
  }));

  it('focuses the input on / unless typing in a field', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const other = document.createElement('textarea');
    document.body.appendChild(other);

    other.focus();
    const ignored = keydown(other, '/');
    expect(ignored.defaultPrevented).toBeFalse();
    expect(document.activeElement).toBe(other);

    other.blur();
    const handled = keydown(document.body, '/');
    expect(handled.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(input);

    other.remove();
  });

  it('opens the highlighted result with the arrow keys and Enter', fakeAsync(() => {
    searchService.search.and.returnValue(Promise.resolve(found(section('page', [result('page', 1), result('page', 2)]))));
    type('rocket');

    component.handleKeydown(new KeyboardEvent('keydown', {key: 'ArrowDown'}));
    component.handleKeydown(new KeyboardEvent('keydown', {key: 'ArrowDown'}));
    component.handleKeydown(new KeyboardEvent('keydown', {key: 'ArrowDown'}));
    component.handleKeydown(new KeyboardEvent('keydown', {key: 'Enter'}));

    expect(router.navigate).toHaveBeenCalledWith([AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, 2]);
    expect(component.isOpen).toBeFalse();
    expect(component.query).toBe('');
  }));

  it('navigates each type to its route', () => {
    expect(component.resultRoute(result('project', 1))).toEqual([AppRoutes.DASHBOARD, AppRoutes.PROJECTS, 1]);
    expect(component.resultRoute(result('page', 2))).toEqual([AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, 2]);
    expect(component.resultRoute(result('diagram', 3))).toEqual([AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, 3]);
    expect(component.resultRoute(result('board', 4))).toEqual([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 4, AppRoutes.KANBAN]);
    expect(component.resultRoute(result('ticket', 5, {boardId: 4, inBacklog: false})))
      .toEqual([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 4, AppRoutes.KANBAN, AppRoutes.TICKETS, 5]);
    expect(component.resultRoute(result('ticket', 6, {boardId: 4, inBacklog: true})))
      .toEqual([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 4, AppRoutes.LIST, AppRoutes.TICKETS, 6]);
  });

  it('closes on Escape and consumes it', fakeAsync(() => {
    type('rocket');
    const event = new KeyboardEvent('keydown', {key: 'Escape', cancelable: true});

    component.handleKeydown(event);

    expect(component.isOpen).toBeFalse();
    expect(event.defaultPrevented).toBeTrue();
  }));

  it('leaves Escape to the layer below when the panel is closed', () => {
    const event = new KeyboardEvent('keydown', {key: 'Escape', cancelable: true});

    component.handleKeydown(event);

    expect(event.defaultPrevented).toBeFalse();
  });
});

describe('splitSnippet', () => {
  it('splits around the first case-insensitive match', () => {
    expect(splitSnippet('…fuel the Rocket and the rocket…', 'rocket')).toEqual({before: '…fuel the ', match: 'Rocket', after: ' and the rocket…'});
  });

  it('keeps the whole text when there is no match', () => {
    expect(splitSnippet('nothing here', 'rocket')).toEqual({before: 'nothing here', match: '', after: ''});
  });
});
