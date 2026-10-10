import {AxiosError} from "axios";
import {DEFAULT_SETTINGS, mapSettings, SettingsService} from "./settings.service";
import {axiosInstance} from "@config/axiosConfig";

describe('mapSettings', () => {
  it('maps snake_case fields to camelCase', () => {
    expect(mapSettings({show_favorites_on_home: false, show_favorites_in_sidebar: true}))
      .toEqual({showFavoritesOnHome: false, showFavoritesInSidebar: true});
  });
});

describe('SettingsService', () => {
  it('defaults to showing favorites on home and in the sidebar', () => {
    const service = new SettingsService();

    expect(service.getSettings()).toEqual({showFavoritesOnHome: true, showFavoritesInSidebar: true});
  });

  it('does not request anything on construction', () => {
    const get = spyOn(axiosInstance, 'get');

    new SettingsService();

    expect(get).not.toHaveBeenCalled();
  });

  it('set stores the given settings', () => {
    const service = new SettingsService();

    service.set({showFavoritesOnHome: false, showFavoritesInSidebar: true});

    expect(service.getSettings()).toEqual({showFavoritesOnHome: false, showFavoritesInSidebar: true});
  });

  it('update sends snake_case values and stores the result', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({
      data: {settings: {show_favorites_on_home: true, show_favorites_in_sidebar: false}}
    }));
    const service = new SettingsService();

    const response = await service.update({showFavoritesOnHome: true, showFavoritesInSidebar: false});

    expect(patch).toHaveBeenCalledWith('/users/me/settings', {settings: {show_favorites_on_home: true, show_favorites_in_sidebar: false}});
    expect(response.success).toBeTrue();
    expect(service.getSettings()).toEqual({showFavoritesOnHome: true, showFavoritesInSidebar: false});
  });

  it('update keeps the previous settings on failure', async () => {
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(new AxiosError('failed')));
    const service = new SettingsService();

    const response = await service.update({showFavoritesOnHome: false, showFavoritesInSidebar: false});

    expect(response.success).toBeFalse();
    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('clear resets to the defaults', () => {
    const service = new SettingsService();
    service.set({showFavoritesOnHome: false, showFavoritesInSidebar: false});

    service.clear();

    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
