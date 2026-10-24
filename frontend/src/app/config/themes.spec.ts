import {THEME_TOKENS, THEMES} from "./themes";

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
