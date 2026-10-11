import {ProjectSelectComponent} from './project-select.component';
import {projectFilterStub} from '../../testing/projectFilterStub';

function selectWith(value: string): HTMLSelectElement {
  const select = document.createElement('select');
  ['', '3', '4'].forEach((optionValue) => select.add(new Option(optionValue, optionValue)));
  select.value = value;
  return select;
}

describe('ProjectSelectComponent', () => {
  let component: ProjectSelectComponent;
  let emitted: (number | null)[];

  beforeEach(() => {
    component = new ProjectSelectComponent(projectFilterStub().service);
    component.projectId = 3;
    emitted = [];
    component.projectChange.subscribe((projectId) => emitted.push(projectId));
  });

  it('emits the chosen project or null for No project', () => {
    component.handleChange(selectWith('4'));
    component.handleChange(selectWith(''));

    expect(emitted).toEqual([4, null]);
  });

  it('keeps showing the saved project until the change is confirmed', () => {
    const select = selectWith('4');

    component.handleChange(select);

    expect(select.value).toBe('3');
  });

  it('does not emit when the selection did not change', () => {
    component.handleChange(selectWith('3'));

    expect(emitted).toEqual([]);
  });
});
