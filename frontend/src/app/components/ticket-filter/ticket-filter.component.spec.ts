import {ElementRef} from '@angular/core';
import {TicketFilterComponent} from './ticket-filter.component';
import {TicketFilters} from '@models/ticket.model';

describe('TicketFilterComponent', () => {
  let component: TicketFilterComponent;
  let emitted: TicketFilters[];

  beforeEach(() => {
    component = new TicketFilterComponent({nativeElement: document.createElement('div')} as ElementRef<HTMLElement>);
    component.filters = {assigneeIds: new Set(), columnIds: new Set()};
    emitted = [];
    component.filtersChange.subscribe((filters) => emitted.push(filters));
  });

  it('keeps earlier choices when several are made before the input updates', () => {
    component.toggleAssignee('none', true);
    component.toggleStatus(null, true);

    const last = emitted[emitted.length - 1];
    expect([...last.assigneeIds]).toEqual(['none']);
    expect([...last.columnIds]).toEqual([null]);
    expect(component.activeCount).toBe(2);
  });

  it('removes an unticked choice and clears all choices', () => {
    component.toggleAssignee(5, true);
    component.toggleAssignee(5, false);
    expect(component.activeCount).toBe(0);

    component.toggleStatus(10, true);
    component.clear();

    expect(emitted[emitted.length - 1].columnIds.size).toBe(0);
    expect(component.activeCount).toBe(0);
  });
});
