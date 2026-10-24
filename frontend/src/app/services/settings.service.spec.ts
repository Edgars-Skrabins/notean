import {AxiosError} from "axios";
import {DEFAULT_SETTINGS, mapSettings, SettingsService} from "./settings.service";
import {axiosInstance} from "@config/axiosConfig";
import {ThemeService} from "@services/theme.service";

const rawSettings = {
  show_favorites_on_home: true,
  show_favorites_in_sidebar: false,
  show_my_work_on_home: true,
  theme: 'graphite' as const,
  theme_mode: 'dark' as const,
};

const settings = {
  showFavoritesOnHome: true,
  showFavoritesInSidebar: false,
  showMyWorkOnHome: true,
  theme: 'graphite' as const,
  themeMode: 'dark' as const,
};

describe('mapSettings', () => {
  it('maps snake_case fields to camelCase', () => {
    expect(mapSettings(rawSettings)).toEqual(settings);
  });
});

describe('SettingsService', () => {
  let themeService: jasmine.SpyObj<ThemeService>;

  function create() {
    return new SettingsService(themeService);
  }

  beforeEach(() => {
    themeService = jasmine.createSpyObj<ThemeService>('ThemeService', ['apply']);
  });

  it('defaults to favorites and My Work on, with Purple haze in system mode', () => {
    expect(create().getSettings()).toEqual({
      showFavoritesOnHome: true,
      showFavoritesInSidebar: true,
      showMyWorkOnHome: true,
      theme: 'purple_haze',
      themeMode: 'system',
    });
  });

  it('does not request anything on construction', () => {
    const get = spyOn(axiosInstance, 'get');

    create();

    expect(get).not.toHaveBeenCalled();
  });

  it('set stores the given settings without applying the theme', () => {
    const service = create();

    service.set(settings);

    expect(service.getSettings()).toEqual(settings);
    expect(themeService.apply).not.toHaveBeenCalled();
  });

  it('update sends snake_case values, stores the result and applies its theme', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {settings: rawSettings}}));
    const service = create();

    const response = await service.update(settings);

    expect(patch).toHaveBeenCalledWith('/users/me/settings', {settings: rawSettings});
    expect(response.success).toBeTrue();
    expect(service.getSettings()).toEqual(settings);
    expect(themeService.apply).toHaveBeenCalledOnceWith('graphite', 'dark');
  });

  it('update keeps the previous settings and theme on failure', async () => {
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(new AxiosError('failed')));
    const service = create();

    const response = await service.update(settings);

    expect(response.success).toBeFalse();
    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(themeService.apply).not.toHaveBeenCalled();
  });

  it('clear resets to the defaults', () => {
    const service = create();
    service.set(settings);

    service.clear();

    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
