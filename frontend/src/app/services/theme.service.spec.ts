import {ActiveTheme, ThemeService} from "./theme.service";
import {THEME_MODE_STORAGE_KEY, THEME_STORAGE_KEY, THEME_SWITCHING_ATTRIBUTE} from "@utils/themeDom";

describe('ThemeService', () => {
  const root = document.documentElement;
  let savedTheme: string | null;
  let savedMode: string | null;
  let savedSwitching: string | null;
  let prefersDark: boolean;
  let changeListener: () => void;

  function create() {
    spyOn(window, 'matchMedia').and.returnValue({
      get matches() {
        return prefersDark;
      },
      addEventListener: (_type: string, listener: () => void) => changeListener = listener,
    } as unknown as MediaQueryList);
    return new ThemeService();
  }

  beforeEach(() => {
    savedTheme = root.getAttribute('data-theme');
    savedMode = root.getAttribute('data-mode');
    savedSwitching = root.getAttribute(THEME_SWITCHING_ATTRIBUTE);
    prefersDark = false;
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(THEME_MODE_STORAGE_KEY);
  });

  function restore(name: string, value: string | null) {
    if (value === null) {
      root.removeAttribute(name);
    } else {
      root.setAttribute(name, value);
    }
  }

  afterEach(() => {
    restore('data-theme', savedTheme);
    restore('data-mode', savedMode);
    restore(THEME_SWITCHING_ATTRIBUTE, savedSwitching);
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(THEME_MODE_STORAGE_KEY);
  });

  it('starts from the cached theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'coffee');
    localStorage.setItem(THEME_MODE_STORAGE_KEY, 'dark');
    let active: ActiveTheme | undefined;

    create().theme$.subscribe((value) => active = value);

    expect(active).toEqual({theme: 'coffee', resolvedMode: 'dark'});
  });

  it('apply sets the attributes, writes the cache and emits', () => {
    const service = create();
    let active: ActiveTheme | undefined;
    service.theme$.subscribe((value) => active = value);

    service.apply('graphite', 'light');

    expect(root.getAttribute('data-theme')).toBe('graphite');
    expect(root.getAttribute('data-mode')).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('graphite');
    expect(localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe('light');
    expect(active).toEqual({theme: 'graphite', resolvedMode: 'light'});
  });

  it('preview sets the attributes without writing the cache', () => {
    const service = create();

    service.preview('paper', 'dark');

    expect(root.getAttribute('data-theme')).toBe('paper');
    expect(root.getAttribute('data-mode')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBeNull();
  });

  it('turns transitions off for two frames while the theme changes', async () => {
    const service = create();

    service.preview('terminal', 'light');

    expect(root.hasAttribute(THEME_SWITCHING_ATTRIBUTE)).toBeTrue();
    expect(root.getAttribute('data-theme')).toBe('terminal');
    expect(root.getAttribute('data-mode')).toBe('light');

    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    expect(root.hasAttribute(THEME_SWITCHING_ATTRIBUTE)).toBeFalse();
  });

  it('follows the system preference live in system mode', () => {
    const service = create();
    service.apply('nature', 'system');
    expect(root.getAttribute('data-mode')).toBe('light');

    prefersDark = true;
    changeListener();

    expect(root.getAttribute('data-mode')).toBe('dark');
  });

  it('ignores system changes in light or dark mode', () => {
    const service = create();
    service.apply('nature', 'light');

    prefersDark = true;
    changeListener();

    expect(root.getAttribute('data-mode')).toBe('light');
  });
});
