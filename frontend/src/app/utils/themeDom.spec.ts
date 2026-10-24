import {readCachedTheme, resolveMode, THEME_MODE_STORAGE_KEY, THEME_STORAGE_KEY} from "./themeDom";

describe('resolveMode', () => {
  it('follows the system preference in system mode', () => {
    expect(resolveMode('system', true)).toBe('dark');
    expect(resolveMode('system', false)).toBe('light');
  });

  it('ignores the system preference in light and dark mode', () => {
    expect(resolveMode('light', true)).toBe('light');
    expect(resolveMode('dark', false)).toBe('dark');
  });
});

describe('readCachedTheme', () => {
  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(THEME_MODE_STORAGE_KEY);
  });

  it('returns the cached theme and mode', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'graphite');
    localStorage.setItem(THEME_MODE_STORAGE_KEY, 'dark');

    expect(readCachedTheme()).toEqual({theme: 'graphite', mode: 'dark'});
  });

  it('falls back to the defaults when nothing is cached', () => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(THEME_MODE_STORAGE_KEY);

    expect(readCachedTheme()).toEqual({theme: 'purple_haze', mode: 'system'});
  });

  it('falls back to the defaults for unknown cached values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    localStorage.setItem(THEME_MODE_STORAGE_KEY, 'dim');

    expect(readCachedTheme()).toEqual({theme: 'purple_haze', mode: 'system'});
  });
});
