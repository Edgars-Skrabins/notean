import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {SettingsResponse, UserSettings} from "@models/settings.model";
import {DEFAULT_THEME, DEFAULT_THEME_MODE, ThemeKey, ThemeMode} from "@config/themes";
import {ThemeService} from "@services/theme.service";

export interface RawSettings {
  show_favorites_on_home: boolean;
  show_favorites_in_sidebar: boolean;
  show_my_work_on_home: boolean;
  theme: ThemeKey;
  theme_mode: ThemeMode;
}

export const DEFAULT_SETTINGS: UserSettings = {
  showFavoritesOnHome: true,
  showFavoritesInSidebar: true,
  showMyWorkOnHome: true,
  theme: DEFAULT_THEME,
  themeMode: DEFAULT_THEME_MODE,
};

export function mapSettings(raw: RawSettings): UserSettings {
  return {
    showFavoritesOnHome: raw.show_favorites_on_home,
    showFavoritesInSidebar: raw.show_favorites_in_sidebar,
    showMyWorkOnHome: raw.show_my_work_on_home,
    theme: raw.theme,
    themeMode: raw.theme_mode,
  };
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private settingsUrl = '/users/me/settings';
  private settingsSubject = new BehaviorSubject<UserSettings>(DEFAULT_SETTINGS);

  readonly settings$: Observable<UserSettings> = this.settingsSubject.asObservable();

  constructor(private themeService: ThemeService) {
  }

  getSettings(): UserSettings {
    return this.settingsSubject.value;
  }

  set(settings: UserSettings) {
    this.settingsSubject.next(settings);
  }

  async update(settings: UserSettings): Promise<SettingsResponse> {
    const payload: RawSettings = {
      show_favorites_on_home: settings.showFavoritesOnHome,
      show_favorites_in_sidebar: settings.showFavoritesInSidebar,
      show_my_work_on_home: settings.showMyWorkOnHome,
      theme: settings.theme,
      theme_mode: settings.themeMode,
    };

    return apiRequest<SettingsResponse>(
      axiosInstance.patch(this.settingsUrl, {settings: payload}),
      (data) => {
        const updated = mapSettings(data.settings);
        this.settingsSubject.next(updated);
        this.themeService.apply(updated.theme, updated.themeMode);
        return {success: true, settings: updated};
      },
    );
  }

  clear() {
    this.settingsSubject.next(DEFAULT_SETTINGS);
  }
}
