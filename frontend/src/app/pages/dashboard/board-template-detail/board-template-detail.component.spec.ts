import {fakeAsync, tick} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {TemplateService} from '@services/template.service';
import {BoardService} from '@services/board.service';
import {TeamService} from '@services/team.service';
import {TemplateDetail} from '@models/template.model';
import {boardDetail} from '../../../testing/boardFixtures';
import {escapeServiceStub} from '../../../testing/escapeServiceStub';
import {BoardTemplateDetailComponent} from './board-template-detail.component';

describe('BoardTemplateDetailComponent', () => {
  let component: BoardTemplateDetailComponent;
  let templateService: jasmine.SpyObj<TemplateService>;
  let boardService: jasmine.SpyObj<BoardService>;
  let router: jasmine.SpyObj<Router>;

  function createComponent(params: Record<string, string> = {}, queryParams: Record<string, string> = {}) {
    const route = {snapshot: {paramMap: convertToParamMap(params), queryParamMap: convertToParamMap(queryParams)}} as unknown as ActivatedRoute;
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    component = new BoardTemplateDetailComponent(route, router, templateService, boardService, teamService, escapeServiceStub().service, {instant: (key: string) => key} as unknown as TranslateService);
    component.ngOnInit();
  }

  function createdContent(): { columns: string[]; priorities: { name: string; color: string }[]; tags: { name: string; color: string }[] } {
    return JSON.parse(templateService.create.calls.mostRecent().args[3]);
  }

  beforeEach(() => {
    templateService = jasmine.createSpyObj<TemplateService>('TemplateService', ['get', 'create', 'save', 'delete']);
    templateService.create.and.returnValue(Promise.resolve({success: true, template: {id: 8} as TemplateDetail}));
    boardService = jasmine.createSpyObj<BoardService>('BoardService', ['getBoard']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
  });

  it('starts a blank template with the default columns and priorities', fakeAsync(() => {
    createComponent();

    component.handleCreate();
    tick();

    expect(templateService.create.calls.mostRecent().args[2]).toBe('UNTITLED_TEMPLATE');
    expect(createdContent().columns).toEqual(['To Do', 'Doing', 'Done']);
    expect(createdContent().priorities.length).toBe(5);
    expect(createdContent().tags).toEqual([]);
    expect(router.navigate).toHaveBeenCalledWith(['dashboard', 'board-templates', 8], {replaceUrl: true});
  }));

  it('copies the columns, priorities and title of an existing board, including later edits', fakeAsync(() => {
    const board = boardDetail();
    board.tags = [{id: 30, name: 'Bug', color: 'red', ticketCount: 2}];
    boardService.getBoard.and.returnValue(Promise.resolve({success: true, board}));
    createComponent({}, {board: '9'});
    tick();

    expect(component.title).toBe('Sprint 12');

    component.handleAddColumn();
    component.columns[2].name = 'Review';
    component.priorities.splice(0, 1);
    component.handleAddTag();
    component.tags[1].name = 'UX';
    component.tags[1].color = 'purple';
    component.handleCreate();
    tick();

    expect(boardService.getBoard).toHaveBeenCalledWith('abc', 9);
    expect(createdContent()).toEqual({
      columns: ['To Do', 'Done', 'Review'],
      priorities: [{name: 'High', color: 'orange'}],
      tags: [{name: 'Bug', color: 'red'}, {name: 'UX', color: 'purple'}],
    });
  }));

  it('shows a template of someone else read-only', fakeAsync(() => {
    templateService.get.and.returnValue(Promise.resolve({
      success: true,
      template: {id: 3, kind: 'board', title: 'Product', canManage: false, lockVersion: 0, content: '{"columns":["Ideas"],"priorities":[]}'} as TemplateDetail,
    }));
    createComponent({id: '3'});
    tick();

    expect(component.canEdit).toBeFalse();
    expect(component.columns.map((column) => column.name)).toEqual(['Ideas']);
  }));
});
