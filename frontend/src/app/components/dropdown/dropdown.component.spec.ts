import {ElementRef} from '@angular/core';
import {DropdownComponent} from './dropdown.component';

function key(name: string): KeyboardEvent {
  return new KeyboardEvent('keydown', {key: name});
}

describe('DropdownComponent', () => {
  let component: DropdownComponent;
  let host: HTMLElement;
  let trigger: HTMLButtonElement;
  let emitted: (string | number | null)[];

  beforeEach(() => {
    host = document.createElement('div');
    trigger = document.createElement('button');
    trigger.className = 'dropdown__trigger';
    trigger.appendChild(document.createElement('span'));
    host.appendChild(trigger);
    component = new DropdownComponent(new ElementRef(host));
    component.options = [{value: null, labelKey: 'ALL_PROJECTS'}, {value: 1, label: 'Game'}, {value: 2, label: 'Website'}];
    component.value = 1;
    emitted = [];
    component.valueChange.subscribe((value) => emitted.push(value));
  });

  it('emits when a different value is picked, and not for the same value', () => {
    component.select(component.options[2]);
    component.select(component.options[1]);

    expect(emitted).toEqual([2]);
  });

  it('shows the option matching the value input, not the last pick', () => {
    component.select(component.options[2]);

    expect(component.selectedOption?.label).toBe('Game');

    component.value = 2;

    expect(component.selectedOption?.label).toBe('Website');
  });

  it('opens on the selected option and moves with the arrow keys, stopping at both ends', () => {
    component.handleKeydown(key('ArrowDown'));

    expect(component.isOpen).toBeTrue();
    expect(component.activeIndex).toBe(1);

    component.handleKeydown(key('ArrowDown'));
    component.handleKeydown(key('ArrowDown'));
    expect(component.activeIndex).toBe(2);

    component.handleKeydown(key('ArrowUp'));
    component.handleKeydown(key('ArrowUp'));
    component.handleKeydown(key('ArrowUp'));
    expect(component.activeIndex).toBe(0);
  });

  it('jumps to the ends with Home and End', () => {
    component.open();

    component.handleKeydown(key('End'));
    expect(component.activeIndex).toBe(2);

    component.handleKeydown(key('Home'));
    expect(component.activeIndex).toBe(0);
  });

  it('selects the active option with Enter and closes', () => {
    component.open();
    component.handleKeydown(key('ArrowDown'));

    component.handleKeydown(key('Enter'));

    expect(emitted).toEqual([2]);
    expect(component.isOpen).toBeFalse();
  });

  it('closes on Escape without emitting', () => {
    component.open();
    component.handleKeydown(key('ArrowDown'));

    component.handleKeydown(key('Escape'));

    expect(component.isOpen).toBeFalse();
    expect(emitted).toEqual([]);
  });

  it('closes on an outside click, but not on a click inside the trigger', () => {
    component.open();

    component.handleOutsideClick({target: trigger.firstChild} as unknown as MouseEvent);
    expect(component.isOpen).toBeTrue();

    component.handleOutsideClick({target: document.createElement('div')} as unknown as MouseEvent);
    expect(component.isOpen).toBeFalse();
  });
});
