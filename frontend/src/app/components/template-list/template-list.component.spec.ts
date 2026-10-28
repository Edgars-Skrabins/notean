import {fakeAsync, tick} from '@angular/core/testing';
import {TemplateService} from '@services/template.service';
import {TeamService} from '@services/team.service';
import {TemplateSummary} from '@models/template.model';
import {errorPhrase} from '@utils/errorPhrase';
import {TemplateListComponent} from './template-list.component';

function summary(id: number, title: string): TemplateSummary {
  return {
    id,
    kind: 'page',
    title,
    lockVersion: 0,
    canManage: true,
    creator: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}},
    createdAt: '',
    updatedAt: '',
  };
}

describe('TemplateListComponent', () => {
  let component: TemplateListComponent;
  let templateService: jasmine.SpyObj<TemplateService>;

  beforeEach(fakeAsync(() => {
    templateService = jasmine.createSpyObj<TemplateService>('TemplateService', ['list', 'delete']);
    templateService.list.and.returnValue(Promise.resolve({success: true, templates: [summary(1, 'Retro'), summary(2, 'Spec')], hasMore: true}));
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode']);
    teamService.getCurrentTeamCode.and.returnValue('abc');

    component = new TemplateListComponent(templateService, teamService);
    component.kind = 'page';
    component.ngOnInit();
    tick();
  }));

  afterEach(() => component.ngOnDestroy());

  it('shows only the built-ins of its kind, filtered by the typed search', () => {
    expect(component.builtIns.map((template) => template.key)).toEqual(['feature-documentation', 'meeting-notes', 'concept', 'performance-improvement-plan']);

    component.searchQuery = 'NOTES';

    expect(component.builtIns.map((template) => template.key)).toEqual(['meeting-notes']);
  });

  it('searches team templates on the server after the debounce and appends the next page', fakeAsync(() => {
    component.handleSearchChange('ret');
    tick(300);

    expect(templateService.list).toHaveBeenCalledWith('abc', 'page', 'ret', 0);

    component.handleLoadMore();
    tick();

    expect(templateService.list).toHaveBeenCalledWith('abc', 'page', 'ret', 2);
    expect(component.templates.length).toBe(4);
  }));

  it('removes a template only after the delete is confirmed and succeeds', fakeAsync(() => {
    templateService.delete.and.returnValue(Promise.resolve({success: false, code: 'TEMPLATE_NOT_FOUND'}));
    component.handleDelete(component.templates[0]);
    component.handleDeleteConfirmed();
    tick();

    expect(component.templates.length).toBe(2);
    expect(component.alertMessage).toBe(errorPhrase('TEMPLATE_NOT_FOUND'));

    templateService.delete.and.returnValue(Promise.resolve({success: true}));
    component.handleDelete(component.templates[0]);
    component.handleDeleteConfirmed();
    tick();

    expect(templateService.delete).toHaveBeenCalledWith('abc', 1);
    expect(component.templates.map((template) => template.id)).toEqual([2]);
  }));
});
