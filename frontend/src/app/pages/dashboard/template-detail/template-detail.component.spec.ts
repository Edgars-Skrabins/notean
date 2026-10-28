import {fakeAsync, tick} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {TemplateService} from '@services/template.service';
import {TeamService} from '@services/team.service';
import {TemplateDetail} from '@models/template.model';
import {TemplateDetailComponent} from './template-detail.component';

function detail(canManage: boolean): TemplateDetail {
  return {
    id: 4,
    kind: 'page',
    title: 'Retro',
    lockVersion: 2,
    canManage,
    creator: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}},
    createdAt: '',
    updatedAt: '',
    content: '<p>Went well</p>',
  };
}

describe('TemplateDetailComponent', () => {
  let component: TemplateDetailComponent;
  let templateService: jasmine.SpyObj<TemplateService>;
  let router: jasmine.SpyObj<Router>;

  function createComponent(params: Record<string, string>) {
    const route = {snapshot: {data: {kind: 'page'}, paramMap: convertToParamMap(params)}} as unknown as ActivatedRoute;
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    component = new TemplateDetailComponent(route, router, templateService, teamService, {instant: (key: string) => key} as unknown as TranslateService);
    component.ngOnInit();
  }

  beforeEach(() => {
    templateService = jasmine.createSpyObj<TemplateService>('TemplateService', ['get', 'create', 'save', 'delete']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
  });

  it('shows a template of someone else read-only', fakeAsync(() => {
    templateService.get.and.returnValue(Promise.resolve({success: true, template: detail(false)}));
    createComponent({id: '4'});
    tick();

    expect(component.canManage).toBeFalse();
    expect(component.layoutItem?.title).toBe('Retro');
  }));

  it('saves with the lock version and keeps the latest template on a conflict', fakeAsync(() => {
    templateService.get.and.returnValue(Promise.resolve({success: true, template: detail(true)}));
    templateService.save.and.returnValue(Promise.resolve({success: false, code: 'EDIT_CONFLICT', latest: {...detail(true), title: 'Newer', lockVersion: 3}}));
    createComponent({id: '4'});
    tick();

    component.handleEdit();
    component.draftContent = '<p>Changed</p>';
    component.handleSave();
    tick();

    expect(templateService.save).toHaveBeenCalledWith('abc', 4, 'Retro', '<p>Changed</p>', 2);
    expect(component.editConflict?.lockVersion).toBe(3);
    expect(component.mode).toBe('edit');
  }));

  it('duplicates a built-in into a team template and opens it', fakeAsync(() => {
    templateService.create.and.returnValue(Promise.resolve({success: true, template: {...detail(true), id: 7}}));
    createComponent({key: 'concept'});

    expect(component.builtIn?.title).toBe('Concept');
    expect(component.canManage).toBeFalse();

    component.handleDuplicate();
    tick();

    expect(templateService.create).toHaveBeenCalledWith('abc', 'page', 'Concept', component.builtIn!.content);
    expect(router.navigate).toHaveBeenCalledWith(['dashboard', 'pages', 'templates', 7]);
  }));

  it('uses a built-in by opening the create popup with its reference', () => {
    createComponent({key: 'concept'});

    component.handleUse();

    expect(router.navigate).toHaveBeenCalledWith(['dashboard', 'pages', 'new'], {queryParams: {template: 'builtin:concept'}});
  });

  it('creates a new template with the untitled name and returns to the templates tab', fakeAsync(() => {
    templateService.create.and.returnValue(Promise.resolve({success: true, template: detail(true)}));
    createComponent({});

    expect(component.mode).toBe('create');

    component.draftContent = '<p>Body</p>';
    component.handleCreate();
    tick();

    expect(templateService.create).toHaveBeenCalledWith('abc', 'page', 'UNTITLED_TEMPLATE', '<p>Body</p>');
    expect(router.navigate).toHaveBeenCalledWith(['dashboard', 'pages', 'templates']);
  }));
});
