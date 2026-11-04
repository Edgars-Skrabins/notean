import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {SwitchComponent} from './switch.component';

@Component({
  imports: [SwitchComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<app-switch>Show favorites</app-switch>'
})
class SwitchHostComponent {
}

describe('SwitchComponent', () => {
  async function render(inputs: {checked?: boolean; disabled?: boolean; ariaLabel?: string} = {}) {
    await TestBed.configureTestingModule({imports: [SwitchComponent]}).compileComponents();
    const fixture = TestBed.createComponent(SwitchComponent);
    Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input') as HTMLInputElement;
    const label = element.querySelector('label') as HTMLLabelElement;
    const emitted: boolean[] = [];
    fixture.componentInstance.checkedChange.subscribe((checked) => emitted.push(checked));
    return {fixture, input, label, emitted};
  }

  it('renders a checkbox with the switch role whose checked state follows the input', async () => {
    const {fixture, input} = await render();

    expect(input.type).toBe('checkbox');
    expect(input.getAttribute('role')).toBe('switch');
    expect(input.checked).toBeFalse();

    fixture.componentRef.setInput('checked', true);
    fixture.detectChanges();

    expect(input.checked).toBeTrue();
  });

  it('emits true then false when the label is clicked twice', async () => {
    const {label, emitted} = await render();

    label.click();
    label.click();

    expect(emitted).toEqual([true, false]);
  });

  it('does not emit and disables the input when disabled', async () => {
    const {input, label, emitted} = await render({disabled: true});

    label.click();

    expect(input.disabled).toBeTrue();
    expect(emitted).toEqual([]);
  });

  it('sets aria-label from ariaLabel', async () => {
    const {input} = await render({ariaLabel: 'Pages'});

    expect(input.getAttribute('aria-label')).toBe('Pages');
  });

  it('projects its content into the label text', async () => {
    await TestBed.configureTestingModule({imports: [SwitchHostComponent]}).compileComponents();
    const fixture = TestBed.createComponent(SwitchHostComponent);
    fixture.detectChanges();

    const labelText = (fixture.nativeElement as HTMLElement).querySelector('.switch__label');

    expect(labelText?.textContent?.trim()).toBe('Show favorites');
  });
});
