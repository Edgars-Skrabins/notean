import {Component} from '@angular/core';
import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {TooltipDirective} from './tooltip.directive';

@Component({
  standalone: true,
  imports: [TooltipDirective],
  template: '<button type="button" [appTooltip]="text">x</button>'
})
class HostComponent {
  text = 'Delete';
}

describe('TooltipDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let button: HTMLButtonElement;

  function tooltip(): HTMLElement | null {
    return document.querySelector('.tooltip');
  }

  function dispatch(type: string) {
    button.dispatchEvent(new Event(type));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [HostComponent]}).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    button = fixture.nativeElement.querySelector('button');
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('shows the text after the hover delay', fakeAsync(() => {
    dispatch('mouseenter');
    tick(299);
    fixture.detectChanges();

    expect(tooltip()).toBeNull();

    tick(1);
    fixture.detectChanges();

    expect(tooltip()?.textContent?.trim()).toBe('Delete');
  }));

  it('does not show when the pointer leaves before the delay', fakeAsync(() => {
    dispatch('mouseenter');
    tick(100);
    dispatch('mouseleave');
    tick(500);
    fixture.detectChanges();

    expect(tooltip()).toBeNull();
  }));

  it('shows at once on keyboard focus', () => {
    button.focus();
    fixture.detectChanges();

    expect(tooltip()?.textContent?.trim()).toBe('Delete');
  });

  it('hides on click', () => {
    button.focus();
    fixture.detectChanges();
    dispatch('click');

    expect(tooltip()).toBeNull();
  });

  it('hides on Esc without preventing its default', () => {
    button.focus();
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
    button.dispatchEvent(event);
    fixture.detectChanges();

    expect(tooltip()).toBeNull();
    expect(event.defaultPrevented).toBeFalse();
  });

  it('hides a hover tooltip on Esc while focus is elsewhere', fakeAsync(() => {
    dispatch('mouseenter');
    tick(300);
    fixture.detectChanges();
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    fixture.detectChanges();

    expect(tooltip()).toBeNull();
  }));

  it('shows nothing for an empty text', fakeAsync(() => {
    fixture.componentInstance.text = '';
    fixture.detectChanges();
    dispatch('mouseenter');
    tick(500);
    button.focus();
    fixture.detectChanges();

    expect(tooltip()).toBeNull();
  }));
});
