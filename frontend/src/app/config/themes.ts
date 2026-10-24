import {PHRASES} from "@config/phrases";

export type ThemeKey =
  | 'purple_haze'
  | 'midnight_purple'
  | 'graphite'
  | 'coffee'
  | 'teal_ocean'
  | 'terminal'
  | 'paper'
  | 'winter_forest'
  | 'nature';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeOption {
  key: ThemeKey;
  phrase: string;
}

export const THEMES: ThemeOption[] = [
  {key: 'purple_haze', phrase: PHRASES.THEME_PURPLE_HAZE},
  {key: 'midnight_purple', phrase: PHRASES.THEME_MIDNIGHT_PURPLE},
  {key: 'graphite', phrase: PHRASES.THEME_GRAPHITE},
  {key: 'coffee', phrase: PHRASES.THEME_COFFEE},
  {key: 'teal_ocean', phrase: PHRASES.THEME_TEAL_OCEAN},
  {key: 'terminal', phrase: PHRASES.THEME_TERMINAL},
  {key: 'paper', phrase: PHRASES.THEME_PAPER},
  {key: 'winter_forest', phrase: PHRASES.THEME_WINTER_FOREST},
  {key: 'nature', phrase: PHRASES.THEME_NATURE},
];

export const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

export const DEFAULT_THEME: ThemeKey = 'purple_haze';

export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export const THEME_TOKENS: string[] = [
  '--font-body',
  '--font-heading',
  '--font-ui',
  '--font-heading-weight',
  '--radius-sm',
  '--radius-md',
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-7',
  '--space-8',
  '--control-height',
  '--control-height-sm',
  '--row-height',
  '--page-background',
  '--dashboard-background',
  '--header-background',
  '--sidebar-background',
  '--backdrop-blur',
  '--page-waves-display',
  '--color-page-wave-1',
  '--color-page-wave-2',
  '--color-page-wave-3',
  '--color-wave-1',
  '--color-wave-2',
  '--color-wave-3',
  '--color-card-bg',
  '--color-card-bg-alt',
  '--color-input-bg',
  '--color-input-bg-focus',
  '--color-input-border',
  '--color-input-border-focus',
  '--color-primary',
  '--color-primary-light',
  '--color-primary-gradient',
  '--color-on-primary',
  '--color-nav-active-bg',
  '--color-nav-active-text',
  '--color-text-heading',
  '--color-text-muted',
  '--color-text-faint',
  '--color-overlay',
  '--shadow-card',
  '--shadow-button',
  '--shadow-button-hover',
  '--color-tint',
  '--color-card-glow',
  '--color-canvas-bg',
  '--color-tooltip-bg',
  '--color-tooltip-text',
  '--shadow-tooltip',
  '--color-success',
  '--color-success-bg',
  '--color-info',
  '--color-info-bg',
  '--color-warning',
  '--color-warning-bg',
  '--color-error',
  '--color-error-bg',
  '--color-chart-1',
  '--color-chart-2',
  '--color-chart-3',
  '--color-chart-4',
  '--color-chart-5',
  '--color-chart-6',
  '--color-chart-7',
  '--color-chart-8',
];
