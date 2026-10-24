import {Result} from "@models/result.model";
import {UsersErrorCode} from "@config/errorCodes";
import {ThemeKey, ThemeMode} from "@config/themes";

export interface UserSettings {
  showFavoritesOnHome: boolean;
  showFavoritesInSidebar: boolean;
  showMyWorkOnHome: boolean;
  theme: ThemeKey;
  themeMode: ThemeMode;
}

export type SettingsResponse = Result<{ settings: UserSettings }, UsersErrorCode>;
