import {ElementRef} from '@angular/core';
import {TicketAssigneesComponent} from './ticket-assignees.component';
import {TeamMember} from '@models/team.model';

function member(id: number, nickname: string): TeamMember {
  return {id, nickname, role: 'user', avatar: {color: 'red', imageUrl: null}};
}

describe('TicketAssigneesComponent', () => {
  let component: TicketAssigneesComponent;
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    component = new TicketAssigneesComponent(new ElementRef(host));
    component.members = [member(1, 'Alice'), member(2, 'Bob'), member(3, 'Bobby'), member(4, 'Carol')];
    component.assignees = [member(2, 'Bob')];
    component.currentUserId = 1;
  });

  it('offers Assign to me only when the current user is not assigned', () => {
    expect(component.isCurrentUserAssigned).toBeFalse();

    component.assignees = [member(1, 'Alice')];

    expect(component.isCurrentUserAssigned).toBeTrue();
  });

  it('lists only members who are not assigned yet', () => {
    expect(component.availableMembers.map((item) => item.nickname)).toEqual(['Alice', 'Bobby', 'Carol']);
  });

  it('filters members by nickname, ignoring case', () => {
    component.searchQuery = 'BOB';

    expect(component.availableMembers.map((item) => item.nickname)).toEqual(['Bobby']);
  });

  it('emits the picked member and closes the picker', () => {
    const add = spyOn(component.add, 'emit');
    component.togglePicker();

    component.handlePick(member(4, 'Carol'));

    expect(add).toHaveBeenCalledWith(4);
    expect(component.isPickerOpen).toBeFalse();
  });

  it('closes the picker on a click outside', () => {
    component.togglePicker();

    component.handleOutsideClick({target: document.body} as unknown as MouseEvent);

    expect(component.isPickerOpen).toBeFalse();
  });

  it('keeps the picker open on a click inside the trigger', () => {
    const trigger = document.createElement('button');
    trigger.className = 'ticketAssignees__trigger';
    const inside = document.createElement('span');
    trigger.appendChild(inside);
    host.appendChild(trigger);
    component.togglePicker();

    component.handleOutsideClick({target: inside} as unknown as MouseEvent);

    expect(component.isPickerOpen).toBeTrue();
  });
});
