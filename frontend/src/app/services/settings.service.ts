import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {axiosInstance} from "@config/axiosConfig";
import {toErrorResult} from "@utils/httpError";
import {AuthService} from "@services/auth.service";
import {SettingsResponse, UserSettings} from "@models/settings.model";

interface RawSettings {
  show_favorites_on_home: boolean;
  show_favorites_in_sidebar: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  showFavoritesOnHome: true,
  showFavoritesInSidebar: true,
};

export function mapSettings(raw: RawSettings): UserSettings {
  return {
    showFavoritesOnHome: raw.show_favorites_on_home,
    showFavoritesInSidebar: raw.show_favorites_in_sidebar,
  };
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private settingsUrl = '/users/me/settings';
  private settingsSubject = new BehaviorSubject<UserSettings>(DEFAULT_SETTINGS);

  readonly settings$: Observable<UserSettings> = this.settingsSubject.asObservable();

  constructor(private authService: AuthService) {
    if (this.authService.isAuthenticated()) {
      this.load();
    }
  }

  getSettings(): UserSettings {
    return this.settingsSubject.value;
  }

  async load(): Promise<SettingsResponse> {
    return axiosInstance.get(this.settingsUrl)
      .then((response) => {
        const settings = mapSettings(response.data.settings);
        this.settingsSubject.next(settings);
        return {success: true, settings} satisfies SettingsResponse;
      })
      .catch((error) => toErrorResult<SettingsResponse>(error, 'Failed to load settings'));
  }

  async update(settings: UserSettings): Promise<SettingsResponse> {
    const payload: RawSettings = {
      show_favorites_on_home: settings.showFavoritesOnHome,
      show_favorites_in_sidebar: settings.showFavoritesInSidebar,
    };

    return axiosInstance.patch(this.settingsUrl, {settings: payload})
      .then((response) => {
        const updated = mapSettings(response.data.settings);
        this.settingsSubject.next(updated);
        return {success: true, settings: updated} satisfies SettingsResponse;
      })
      .catch((error) => toErrorResult<SettingsResponse>(error, 'Failed to update settings'));
  }

  clear() {
    this.settingsSubject.next(DEFAULT_SETTINGS);
  }
}
