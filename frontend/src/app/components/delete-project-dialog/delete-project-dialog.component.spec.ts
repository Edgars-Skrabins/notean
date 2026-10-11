import {DeleteProjectDialogComponent} from './delete-project-dialog.component';

describe('DeleteProjectDialogComponent', () => {
  let component: DeleteProjectDialogComponent;

  beforeEach(() => {
    component = new DeleteProjectDialogComponent();
    component.projectName = 'Game';
  });

  it('keeps the items by default', () => {
    expect(component.mode).toBe('keep');
  });

  it('enables Delete only when the typed name matches exactly', () => {
    component.typedName = 'game';
    expect(component.canDelete).toBeFalse();

    component.typedName = 'Game';
    expect(component.canDelete).toBeTrue();
  });

  it('emits the chosen mode and typed name', () => {
    const confirmed = spyOn(component.confirmed, 'emit');
    component.mode = 'delete_items';
    component.typedName = 'Game';

    component.handleDelete();

    expect(confirmed).toHaveBeenCalledWith({mode: 'delete_items', confirmName: 'Game'});
  });

  it('does not emit with a wrong name', () => {
    const confirmed = spyOn(component.confirmed, 'emit');
    component.typedName = 'Gam';

    component.handleDelete();

    expect(confirmed).not.toHaveBeenCalled();
  });
});
