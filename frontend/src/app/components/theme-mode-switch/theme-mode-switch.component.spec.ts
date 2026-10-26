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
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    return {fixture, buttons};
  }

  it('renders System, Light and Dark with the current mode pressed', async () => {
    const {buttons} = await render('light');

    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['THEME_MODE_SYSTEM', 'THEME_MODE_LIGHT', 'THEME_MODE_DARK']);
    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
  });

  it('emits the clicked mode', async () => {
    const {fixture, buttons} = await render('system');
    const emitted: ThemeMode[] = [];
    fixture.componentInstance.modeChange.subscribe((mode) => emitted.push(mode));

    buttons[2].click();

    expect(emitted).toEqual(['dark']);
  });

  it('does not emit when the current mode is clicked', async () => {
    const {fixture, buttons} = await render('system');
    const emitted: ThemeMode[] = [];
    fixture.componentInstance.modeChange.subscribe((mode) => emitted.push(mode));

    buttons[0].click();

    expect(emitted).toEqual([]);
  });
});
