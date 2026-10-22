import {firstValueFrom} from 'rxjs';
import {ProjectSelectorComponent} from './project-selector.component';
import {ProjectSummary} from '@models/project.model';
import {PHRASES} from '@config/phrases';
import {projectFilterStub} from '../../testing/projectFilterStub';

function project(id: number, name: string): ProjectSummary {
  return {id, name, description: '', owner: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}}, memberCount: 1, canManage: false};
}

describe('ProjectSelectorComponent', () => {
  it('lists All projects first, then the visible projects alphabetically', async () => {
    const filter = projectFilterStub();
    filter.projects.next([project(1, 'Website'), project(2, 'Game')]);
    const component = new ProjectSelectorComponent(filter.service);

    expect(await firstValueFrom(component.options$)).toEqual([
      {value: null, labelKey: PHRASES.ALL_PROJECTS},
      {value: 2, label: 'Game'},
      {value: 1, label: 'Website'},
    ]);
  });

  it('selects a project or All', () => {
    const filter = projectFilterStub();
    const component = new ProjectSelectorComponent(filter.service);

    component.handleChange(2);
    expect(filter.selected.value).toBe(2);
    expect(component.selectedProjectId).toBe(2);

    component.handleChange(null);
    expect(filter.selected.value).toBeNull();
    expect(component.selectedProjectId).toBeNull();
  });
});
