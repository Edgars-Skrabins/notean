import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {ThemeKey, ThemeMode} from "@config/themes";
import {
  applyThemeAttributes,
  readCachedTheme,
  resolveMode,
  ResolvedThemeMode,
  THEME_MODE_STORAGE_KEY,
  THEME_STORAGE_KEY
} from "@utils/themeDom";

export interface ActiveTheme {
  theme: ThemeKey;
  resolvedMode: ResolvedThemeMode;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private darkQuery = matchMedia('(prefers-color-scheme: dark)');
  private current = readCachedTheme();
  private themeSubject = new BehaviorSubject<ActiveTheme>(this.resolve());

  readonly theme$: Observable<ActiveTheme> = this.themeSubject.asObservable();

  constructor() {
    this.darkQuery.addEventListener('change', () => {
      if (this.current.mode === 'system') {
        this.render();
      }
    });
  }

  apply(theme: ThemeKey, mode: ThemeMode) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
    this.preview(theme, mode);
  }

  preview(theme: ThemeKey, mode: ThemeMode) {
    this.current = {theme, mode};
    this.render();
  }

  private resolve(): ActiveTheme {
    return {theme: this.current.theme, resolvedMode: resolveMode(this.current.mode, this.darkQuery.matches)};
  }

  private render() {
    const active = this.resolve();
    applyThemeAttributes(document.documentElement, active.theme, active.resolvedMode);
    this.themeSubject.next(active);
  }
}
