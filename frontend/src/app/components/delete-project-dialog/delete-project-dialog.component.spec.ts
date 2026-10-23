import {DeleteProjectDialogComponent} from './delete-project-dialog.component';
import {escapeServiceStub, EscapeServiceStub} from '../../testing/escapeServiceStub';

describe('DeleteProjectDialogComponent', () => {
  let component: DeleteProjectDialogComponent;
  let escape: EscapeServiceStub;

  beforeEach(() => {
    escape = escapeServiceStub();
    component = new DeleteProjectDialogComponent(escape.service);
    component.projectName = 'Game';
    component.ngOnInit();
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

  it('cancels on Escape and stops listening once destroyed', () => {
    const cancelled = spyOn(component.cancelled, 'emit');

    escape.press();
    expect(cancelled).toHaveBeenCalledTimes(1);

    component.ngOnDestroy();
    expect(escape.handlers).toEqual([]);
  });
});
