import {EditConflictDialogComponent} from './edit-conflict-dialog.component';
import {escapeServiceStub, EscapeServiceStub} from '../../testing/escapeServiceStub';

describe('EditConflictDialogComponent', () => {
  let component: EditConflictDialogComponent;
  let escape: EscapeServiceStub;

  beforeEach(() => {
    escape = escapeServiceStub();
    component = new EditConflictDialogComponent(escape.service);
    component.ngOnInit();
  });

  it('emits loadLatest and overwrite from their buttons', () => {
    const loadLatest = spyOn(component.loadLatest, 'emit');
    const overwrite = spyOn(component.overwrite, 'emit');

    component.handleLoadLatest();
    component.handleOverwrite();

    expect(loadLatest).toHaveBeenCalledTimes(1);
    expect(overwrite).toHaveBeenCalledTimes(1);
  });

  it('cancels on Escape without choosing and stops listening once destroyed', () => {
    const cancelled = spyOn(component.cancelled, 'emit');
    const loadLatest = spyOn(component.loadLatest, 'emit');
    const overwrite = spyOn(component.overwrite, 'emit');

    escape.press();
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(loadLatest).not.toHaveBeenCalled();
    expect(overwrite).not.toHaveBeenCalled();

    component.ngOnDestroy();
    expect(escape.handlers).toEqual([]);
  });
});
