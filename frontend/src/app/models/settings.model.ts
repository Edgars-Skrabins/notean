import {Result} from "@models/result.model";
import {UsersErrorCode} from "@config/errorCodes";

export interface UserSettings {
  showFavoritesOnHome: boolean;
  showFavoritesInSidebar: boolean;
}

export type SettingsResponse = Result<{ settings: UserSettings }, UsersErrorCode>;
