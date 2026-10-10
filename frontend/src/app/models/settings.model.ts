export interface UserSettings {
  showFavoritesOnHome: boolean;
  showFavoritesInSidebar: boolean;
}

export type SettingsResponse =
  | { success: true; settings: UserSettings }
  | { success: false; statusMessage: string };
