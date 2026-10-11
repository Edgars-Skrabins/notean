import {firstValueFrom} from 'rxjs';
import {ProjectSelectorComponent} from './project-selector.component';
import {ProjectSummary} from '@models/project.model';
import {projectFilterStub} from '../../testing/projectFilterStub';

function project(id: number, name: string): ProjectSummary {
  return {id, name, description: '', owner: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}}, memberCount: 1, canManage: false};
}

describe('ProjectSelectorComponent', () => {
  it('lists the visible projects alphabetically', async () => {
    const filter = projectFilterStub();
    filter.projects.next([project(1, 'Website'), project(2, 'Game')]);
    const component = new ProjectSelectorComponent(filter.service);

    expect((await firstValueFrom(component.projects$)).map((item) => item.name)).toEqual(['Game', 'Website']);
  });

  it('selects a project or All', () => {
    const filter = projectFilterStub();
    const component = new ProjectSelectorComponent(filter.service);

    component.handleChange('2');
    expect(filter.selected.value).toBe(2);
    expect(component.selectedValue).toBe('2');

    component.handleChange('');
    expect(filter.selected.value).toBeNull();
    expect(component.selectedValue).toBe('');
  });
});
