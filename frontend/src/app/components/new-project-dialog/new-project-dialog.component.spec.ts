import {NewProjectDialogComponent} from './new-project-dialog.component';
import {escapeServiceStub} from '../../testing/escapeServiceStub';

describe('NewProjectDialogComponent', () => {
  let component: NewProjectDialogComponent;

  beforeEach(() => {
    component = new NewProjectDialogComponent(escapeServiceStub().service);
    component.currentUserId = 7;
    component.ngOnInit();
  });

  it('preselects the creator as owner and member', () => {
    expect(component.params).toEqual({name: '', description: '', ownerUserId: 7, memberIds: [7]});
  });

  it('can only create once a name is entered', () => {
    expect(component.canCreate).toBeFalse();

    component.params = {...component.params, name: '  '};
    expect(component.canCreate).toBeFalse();

    component.params = {...component.params, name: 'Game'};
    expect(component.canCreate).toBeTrue();
  });

  it('emits the trimmed params on Create', () => {
    const confirmed = spyOn(component.confirmed, 'emit');
    component.params = {...component.params, name: ' Game '};

    component.handleCreate();

    expect(confirmed).toHaveBeenCalledWith({name: 'Game', description: '', ownerUserId: 7, memberIds: [7]});
  });

  it('does not emit while busy', () => {
    const confirmed = spyOn(component.confirmed, 'emit');
    component.params = {...component.params, name: 'Game'};
    component.busy = true;

    component.handleCreate();

    expect(confirmed).not.toHaveBeenCalled();
  });
});
