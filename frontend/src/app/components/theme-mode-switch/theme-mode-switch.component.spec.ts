import {TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {ThemeModeSwitchComponent} from './theme-mode-switch.component';
import {ThemeMode} from "@config/themes";

describe('ThemeModeSwitchComponent', () => {
  async function render(mode: ThemeMode) {
    await TestBed.configureTestingModule({
      imports: [ThemeModeSwitchComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ThemeModeSwitchComponent);
    fixture.componentRef.setInput('mode', mode);
    fixture.detectChanges();
    const options = Array.from(fixture.nativeElement.querySelectorAll('.themeModeSwitch__option')) as HTMLLabelElement[];
    const radios = Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
    return {fixture, options, radios};
  }

  it('renders System, Light and Dark as a radio group with the current mode checked', async () => {
    const {fixture, options, radios} = await render('light');

    expect(fixture.nativeElement.querySelector('.themeModeSwitch').getAttribute('role')).toBe('radiogroup');
    expect(options.map((option) => option.textContent?.trim())).toEqual(['THEME_MODE_SYSTEM', 'THEME_MODE_LIGHT', 'THEME_MODE_DARK']);
    expect(radios.map((radio) => radio.checked)).toEqual([false, true, false]);
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
  });

  it('emits the mode of a newly checked radio', async () => {
    const {fixture, radios} = await render('system');
    const emitted: ThemeMode[] = [];
    fixture.componentInstance.modeChange.subscribe((mode) => emitted.push(mode));

    radios[2].checked = true;
    radios[2].dispatchEvent(new Event('change'));

    expect(emitted).toEqual(['dark']);
  });

  it('emits the clicked mode, but not the current one', async () => {
    const {fixture, options} = await render('system');
    const emitted: ThemeMode[] = [];
    fixture.componentInstance.modeChange.subscribe((mode) => emitted.push(mode));

    options[0].click();
    options[1].click();

    expect(emitted).toEqual(['light']);
  });
});
