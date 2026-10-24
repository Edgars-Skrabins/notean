import {MoveToBoardDialogComponent} from './move-to-board-dialog.component';
import {escapeServiceStub, EscapeServiceStub} from '../../testing/escapeServiceStub';

describe('MoveToBoardDialogComponent', () => {
  let component: MoveToBoardDialogComponent;
  let escape: EscapeServiceStub;

  beforeEach(() => {
    escape = escapeServiceStub();
    component = new MoveToBoardDialogComponent(escape.service);
    component.columns = [{id: 3, title: 'To Do'}, {id: 4, title: 'Doing'}];
    component.ngOnInit();
  });

  it('preselects the first column', () => {
    expect(component.selectedColumnId).toBe(3);
  });

  it('emits the chosen column on Move', () => {
    const moved = spyOn(component.moved, 'emit');
    component.selectedColumnId = 4;

    component.handleMove();

    expect(moved).toHaveBeenCalledWith({columnId: 4});
  });

  it('emits cancelled on Cancel', () => {
    const cancelled = spyOn(component.cancelled, 'emit');

    component.handleCancel();

    expect(cancelled).toHaveBeenCalled();
  });

  it('emits cancelled on Escape', () => {
    const cancelled = spyOn(component.cancelled, 'emit');

    escape.press();

    expect(cancelled).toHaveBeenCalled();
  });
});
