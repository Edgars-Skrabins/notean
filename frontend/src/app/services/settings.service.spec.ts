import {AxiosError} from "axios";
import {DEFAULT_SETTINGS, SettingsService} from "./settings.service";
import {axiosInstance} from "@config/axiosConfig";
import {AuthService} from "@services/auth.service";

describe('SettingsService', () => {
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);
    authService.isAuthenticated.and.returnValue(false);
  });

  it('defaults to showing favorites on home and in the sidebar', () => {
    const service = new SettingsService(authService);

    expect(service.getSettings()).toEqual({showFavoritesOnHome: true, showFavoritesInSidebar: true});
  });

  it('loads on construction when authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);
    const get = spyOn(axiosInstance, 'get').and.returnValue(new Promise(() => undefined));

    new SettingsService(authService);

    expect(get).toHaveBeenCalledWith('/users/me/settings');
  });

  it('does not load on construction when logged out', () => {
    const get = spyOn(axiosInstance, 'get');

    new SettingsService(authService);

    expect(get).not.toHaveBeenCalled();
  });

  it('load maps the saved settings', async () => {
    spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({
      data: {settings: {show_favorites_on_home: false, show_favorites_in_sidebar: true}}
    }));
    const service = new SettingsService(authService);

    await service.load();

    expect(service.getSettings()).toEqual({showFavoritesOnHome: false, showFavoritesInSidebar: true});
  });

  it('update sends snake_case values and stores the result', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({
      data: {settings: {show_favorites_on_home: true, show_favorites_in_sidebar: false}}
    }));
    const service = new SettingsService(authService);

    const response = await service.update({showFavoritesOnHome: true, showFavoritesInSidebar: false});

    expect(patch).toHaveBeenCalledWith('/users/me/settings', {settings: {show_favorites_on_home: true, show_favorites_in_sidebar: false}});
    expect(response.success).toBeTrue();
    expect(service.getSettings()).toEqual({showFavoritesOnHome: true, showFavoritesInSidebar: false});
  });

  it('update keeps the previous settings on failure', async () => {
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(new AxiosError('failed')));
    const service = new SettingsService(authService);

    const response = await service.update({showFavoritesOnHome: false, showFavoritesInSidebar: false});

    expect(response.success).toBeFalse();
    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('clear resets to the defaults', async () => {
    spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({
      data: {settings: {show_favorites_on_home: false, show_favorites_in_sidebar: false}}
    }));
    const service = new SettingsService(authService);
    await service.load();

    service.clear();

    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
