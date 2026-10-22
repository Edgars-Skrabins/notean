import {firstValueFrom} from 'rxjs';
import {ProjectSelectComponent} from './project-select.component';
import {ProjectSummary} from '@models/project.model';
import {PHRASES} from '@config/phrases';
import {projectFilterStub} from '../../testing/projectFilterStub';

function project(id: number, name: string): ProjectSummary {
  return {id, name, description: '', owner: {id: 1, nickname: 'alice', avatar: {color: 'red', imageUrl: null}}, memberCount: 1, canManage: false};
}

describe('ProjectSelectComponent', () => {
  let component: ProjectSelectComponent;
  let emitted: (number | null)[];
  let filter: ReturnType<typeof projectFilterStub>;

  beforeEach(() => {
    filter = projectFilterStub();
    component = new ProjectSelectComponent(filter.service);
    component.projectId = 3;
    emitted = [];
    component.projectChange.subscribe((projectId) => emitted.push(projectId));
  });

  it('offers No project first, then the visible projects', async () => {
    filter.projects.next([project(3, 'Game'), project(4, 'Website')]);

    expect(await firstValueFrom(component.options$)).toEqual([
      {value: null, labelKey: PHRASES.NO_PROJECT},
      {value: 3, label: 'Game'},
      {value: 4, label: 'Website'},
    ]);
  });

  it('emits the chosen project or null for No project', () => {
    component.handleChange(4);
    component.handleChange(null);

    expect(emitted).toEqual([4, null]);
  });
});
