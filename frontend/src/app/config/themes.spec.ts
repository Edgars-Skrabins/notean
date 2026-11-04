import {THEME_TOKENS, THEMES} from "./themes";
import {colorStops, composite, contrastRatio, Rgba} from "../testing/contrast";

describe('theme token contract', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  for (const theme of THEMES) {
    for (const mode of ['dark', 'light']) {
      it(`${theme.key} ${mode} provides every token`, () => {
        element.setAttribute('data-theme', theme.key);
        element.setAttribute('data-mode', mode);
        const style = getComputedStyle(element);

        const missing = THEME_TOKENS.filter((token) => style.getPropertyValue(token).trim() === '');

        expect(missing).toEqual([]);
      });
    }
  }
});

interface Surface {
  name: string;
  color: Rgba;
}

const TEXT_FLOOR = 4.5;
const NON_TEXT_FLOOR = 3;
const SEMANTIC_TOKENS = ['--color-success', '--color-info', '--color-warning', '--color-error'];

describe('theme contrast', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  for (const theme of THEMES) {
    for (const mode of ['dark', 'light']) {
      const label = `${theme.key} ${mode}`;

      const read = (token: string): string => {
        element.setAttribute('data-theme', theme.key);
        element.setAttribute('data-mode', mode);
        return getComputedStyle(element).getPropertyValue(token).trim();
      };

      const stops = (token: string): Rgba[] => colorStops(read(token));

      const single = (token: string): Rgba => stops(token)[0];

      const named = (name: string, colors: Rgba[]): Surface[] =>
        colors.map((color, index) => ({name: colors.length > 1 ? `${name} stop ${index + 1}` : name, color}));

      const over = (layer: Surface[], bases: Surface[]): Surface[] =>
        layer.flatMap((top) => bases.map((base) => ({name: `${top.name} over ${base.name}`, color: composite(top.color, base.color)})));

      const card = (): Surface => ({name: 'card-bg', color: single('--color-card-bg')});
      const cardAlt = (): Surface => ({name: 'card-bg-alt', color: single('--color-card-bg-alt')});
      const input = (): Surface => ({name: 'input-bg', color: composite(single('--color-input-bg'), single('--color-card-bg'))});
      const page = (): Surface[] => named('page-background', stops('--page-background'));
      const dashboard = (): Surface[] => named('dashboard-background', stops('--dashboard-background'));
      const sidebar = (): Surface[] => over(named('sidebar-background', stops('--sidebar-background')), dashboard());
      const header = (): Surface[] => over(named('header-background', stops('--header-background')), dashboard());
      const allSurfaces = (): Surface[] => [card(), cardAlt(), input(), ...page(), ...dashboard(), ...sidebar(), ...header()];

      const ratio = (foreground: Rgba, background: Rgba): number =>
        contrastRatio(composite(foreground, background), background);

      const expectOn = (token: string, surfaces: Surface[], floor: number, foreground: Rgba = single(token)) => {
        for (const surface of surfaces) {
          const measured = ratio(foreground, surface.color);
          expect(measured)
            .withContext(`${label} ${token} on ${surface.name} (${measured.toFixed(2)}:1)`)
            .toBeGreaterThanOrEqual(floor);
        }
      };

      it(`${label} text tokens reach ${TEXT_FLOOR}:1 on every surface`, () => {
        for (const token of ['--color-text-heading', '--color-text-muted', '--color-text-faint']) {
          expectOn(token, allSurfaces(), TEXT_FLOOR);
        }
      });

      it(`${label} muted text is at least as strong as faint text on cards`, () => {
        const background = card().color;
        const muted = ratio(single('--color-text-muted'), background);
        const faint = ratio(single('--color-text-faint'), background);

        expect(muted).withContext(`${label} muted ${muted.toFixed(2)} vs faint ${faint.toFixed(2)}`).toBeGreaterThanOrEqual(faint);
      });

      it(`${label} primary-light text reaches ${TEXT_FLOOR}:1 on cards and inputs`, () => {
        expectOn('--color-primary-light', [card(), cardAlt(), input()], TEXT_FLOOR);
      });

      it(`${label} on-primary text reaches ${TEXT_FLOOR}:1 on the primary fill and gradient`, () => {
        const fills = [...named('primary', stops('--color-primary')), ...named('primary-gradient', stops('--color-primary-gradient'))];
        expectOn('--color-on-primary', fills, TEXT_FLOOR);
      });

      it(`${label} active nav text reaches ${TEXT_FLOOR}:1 on the active nav background`, () => {
        expectOn('--color-nav-active-text', over(named('nav-active-bg', stops('--color-nav-active-bg')), sidebar()), TEXT_FLOOR);
      });

      it(`${label} control border reaches ${NON_TEXT_FLOOR}:1 on every surface a control sits on`, () => {
        expectOn('--color-control-border', [card(), cardAlt(), input(), ...page(), ...dashboard(), ...header()], NON_TEXT_FLOOR);
      });

      it(`${label} focus border reaches ${NON_TEXT_FLOOR}:1 on cards and inputs`, () => {
        expectOn('--color-input-border-focus', [card(), input()], NON_TEXT_FLOOR);
      });

      it(`${label} status colours reach ${TEXT_FLOOR}:1 on their backgrounds and on cards`, () => {
        for (const token of SEMANTIC_TOKENS) {
          const tinted = {name: `${token.slice(2)}-bg over card-bg`, color: composite(single(`${token}-bg`), card().color)};
          expectOn(token, [tinted, card()], TEXT_FLOOR);
        }
      });

      it(`${label} tooltip text reaches ${TEXT_FLOOR}:1 on the tooltip`, () => {
        expectOn('--color-tooltip-text', [{name: 'tooltip-bg', color: single('--color-tooltip-bg')}], TEXT_FLOOR);
      });
    }
  }
});
