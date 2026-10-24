import {TestBed} from '@angular/core/testing';
import {TranslateModule} from '@ngx-translate/core';
import {ThemePickerComponent} from './theme-picker.component';
import {ThemeKey} from "@config/themes";

describe('ThemePickerComponent', () => {
  async function render() {
    await TestBed.configureTestingModule({
      imports: [ThemePickerComponent, TranslateModule.forRoot()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ThemePickerComponent);
    fixture.componentRef.setInput('theme', 'coffee');
    fixture.componentRef.setInput('resolvedMode', 'light');
    fixture.detectChanges();
    const cards = Array.from(fixture.nativeElement.querySelectorAll('.themePicker__card')) as HTMLButtonElement[];
    return {fixture, cards};
  }

  it('renders the nine themes in order with the selected one pressed', async () => {
    const {cards} = await render();

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
    expect(cards.filter((card) => card.getAttribute('aria-pressed') === 'true').length).toBe(1);
    expect(cards[3].getAttribute('aria-pressed')).toBe('true');
  });

  it('renders each preview in its own theme and the resolved mode', async () => {
    const {cards} = await render();
    const preview = cards[5].querySelector('.themePicker__preview') as HTMLElement;

    expect(preview.getAttribute('data-theme')).toBe('terminal');
    expect(preview.getAttribute('data-mode')).toBe('light');
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
