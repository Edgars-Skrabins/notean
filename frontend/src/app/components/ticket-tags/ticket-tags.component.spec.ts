import {ElementRef} from '@angular/core';
import {TicketTagsComponent} from './ticket-tags.component';
import {Tag} from '@models/tag.model';

function tag(id: number, name: string): Tag {
  return {id, name, color: 'blue', ticketCount: 0};
}

describe('TicketTagsComponent', () => {
  let component: TicketTagsComponent;

  beforeEach(() => {
    component = new TicketTagsComponent(new ElementRef(document.createElement('div')));
    component.tags = [tag(1, 'api'), tag(2, 'Bug'), tag(3, 'frontend')];
    component.tagIds = [3, 1];
  });

  it('shows the ticket tags in board order', () => {
    expect(component.ticketTags.map((item) => item.name)).toEqual(['api', 'frontend']);
  });

  it('filters the board tags by name, ignoring case', () => {
    component.searchQuery = 'BU';

    expect(component.matchingTags.map((item) => item.name)).toEqual(['Bug']);
  });

  it('offers Create tag only for a new name of 1 to 24 characters', () => {
    expect(component.createName).toBeNull();

    component.searchQuery = '  bug ';
    expect(component.createName).toBeNull();

    component.searchQuery = '  bu ';
    expect(component.createName).toBe('bu');

    component.searchQuery = 'a'.repeat(25);
    expect(component.createName).toBeNull();

    component.searchQuery = 'a'.repeat(24);
    expect(component.createName).toBe('a'.repeat(24));
  });

  it('emits add or remove when a row is checked or unchecked, keeping the panel open', () => {
    const add = spyOn(component.add, 'emit');
    const remove = spyOn(component.remove, 'emit');
    component.togglePicker();

    component.handleToggle(tag(2, 'Bug'), true);
    component.handleToggle(tag(1, 'api'), false);

    expect(add).toHaveBeenCalledWith(2);
    expect(remove).toHaveBeenCalledWith(1);
    expect(component.isPickerOpen).toBeTrue();
  });

  it('emits the trimmed name on create and clears the search', () => {
    const create = spyOn(component.create, 'emit');
    component.searchQuery = ' customer ';

    component.handleCreate();

    expect(create).toHaveBeenCalledWith('customer');
    expect(component.searchQuery).toBe('');
  });

  it('closes the panel on a click outside', () => {
    component.togglePicker();

    component.handleOutsideClick({target: document.body} as unknown as MouseEvent);

    expect(component.isPickerOpen).toBeFalse();
  });
});
