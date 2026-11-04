import {TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {ThemePickerComponent} from './theme-picker.component';
import {ThemeKey} from "@config/themes";

describe('ThemePickerComponent', () => {
  async function render() {
    await TestBed.configureTestingModule({
      imports: [ThemePickerComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ThemePickerComponent);
    fixture.componentRef.setInput('theme', 'coffee');
    fixture.componentRef.setInput('resolvedMode', 'light');
    fixture.detectChanges();
    const cards = Array.from(fixture.nativeElement.querySelectorAll('.themePicker__card')) as HTMLLabelElement[];
    const radios = Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
    return {fixture, cards, radios};
  }

  it('renders the nine themes in order as a radio group with the selected one checked', async () => {
    const {fixture, cards, radios} = await render();

    expect(fixture.nativeElement.querySelector('.themePicker').getAttribute('role')).toBe('radiogroup');
    expect(cards.length).toBe(9);
    expect(cards.map((card) => card.querySelector('.themePicker__name')?.textContent?.trim())).toEqual([
      'THEME_PURPLE_HAZE',
      'THEME_MIDNIGHT_PURPLE',
      'THEME_GRAPHITE',
      'THEME_COFFEE',
      'THEME_TEAL_OCEAN',
      'THEME_TERMINAL',
      'THEME_PAPER',
      'THEME_WINTER_FOREST',
      'THEME_NATURE',
    ]);
    expect(radios.length).toBe(9);
    expect(radios.filter((radio) => radio.checked).length).toBe(1);
    expect(radios[3].checked).toBeTrue();
  });

  it('renders each preview in its own theme and the resolved mode', async () => {
    const {cards} = await render();
    const preview = cards[5].querySelector('.themePicker__preview') as HTMLElement;

    expect(preview.getAttribute('data-theme')).toBe('terminal');
    expect(preview.getAttribute('data-mode')).toBe('light');
  });

  it('emits the theme of a newly checked radio', async () => {
    const {fixture, radios} = await render();
    const emitted: ThemeKey[] = [];
    fixture.componentInstance.themeChange.subscribe((theme) => emitted.push(theme));

    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('change'));

    expect(emitted).toEqual(['midnight_purple']);
  });

  it('emits the clicked theme key, but not for the selected one', async () => {
    const {fixture, cards} = await render();
    const emitted: ThemeKey[] = [];
    fixture.componentInstance.themeChange.subscribe((theme) => emitted.push(theme));

    cards[3].click();
    cards[6].click();

    expect(emitted).toEqual(['paper']);
  });
});
