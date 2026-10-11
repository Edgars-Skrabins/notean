import {KanbanColumnComponent} from "./kanban-column.component";

describe('KanbanColumnComponent rename', () => {
  let component: KanbanColumnComponent;
  let emitted: { title: string }[];

  beforeEach(() => {
    component = new KanbanColumnComponent();
    component.column = {id: 1, title: 'To do', position: 0, tickets: []};
    emitted = [];
    component.renameColumn.subscribe((event) => emitted.push(event));
  });

  it('startRename opens the editor with the current title', () => {
    component.startRename();

    expect(component.isRenaming).toBeTrue();
    expect(component.renameDraft).toBe('To do');
  });

  it('commitRename emits the trimmed title when it changed', () => {
    component.startRename();
    component.renameDraft = '  Doing  ';

    component.commitRename();

    expect(component.isRenaming).toBeFalse();
    expect(emitted).toEqual([{title: 'Doing'}]);
  });

  it('commitRename does not emit when the title is blank', () => {
    component.startRename();
    component.renameDraft = '   ';

    component.commitRename();

    expect(component.isRenaming).toBeFalse();
    expect(emitted).toEqual([]);
  });

  it('commitRename does not emit when the title is unchanged', () => {
    component.startRename();
    component.renameDraft = ' To do ';

    component.commitRename();

    expect(emitted).toEqual([]);
  });

  it('commitRename does nothing when not renaming', () => {
    component.renameDraft = 'Doing';

    component.commitRename();

    expect(emitted).toEqual([]);
  });

  it('commitRename after cancelRename does not emit', () => {
    component.startRename();
    component.renameDraft = 'Doing';

    component.cancelRename();
    component.commitRename();

    expect(component.isRenaming).toBeFalse();
    expect(emitted).toEqual([]);
  });
});
