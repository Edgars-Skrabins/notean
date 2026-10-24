import {DEFAULT_THEME, DEFAULT_THEME_MODE, THEME_MODES, THEMES, ThemeKey, ThemeMode} from "@config/themes";

export type ResolvedThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';
export const THEME_MODE_STORAGE_KEY = 'themeMode';

export function resolveMode(mode: ThemeMode, prefersDark: boolean): ResolvedThemeMode {
  if (mode === 'system') {
    return prefersDark ? 'dark' : 'light';
  }
  return mode;
}

export function applyThemeAttributes(element: HTMLElement, theme: ThemeKey, resolvedMode: ResolvedThemeMode): void {
  element.setAttribute('data-theme', theme);
  element.setAttribute('data-mode', resolvedMode);
}

export function readCachedTheme(): { theme: ThemeKey, mode: ThemeMode } {
  const theme = localStorage.getItem(THEME_STORAGE_KEY);
  const mode = localStorage.getItem(THEME_MODE_STORAGE_KEY);
  return {
    theme: THEMES.find((option) => option.key === theme)?.key ?? DEFAULT_THEME,
    mode: THEME_MODES.find((option) => option === mode) ?? DEFAULT_THEME_MODE,
  };
}

export function themeToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
