import {fakeAsync, tick} from "@angular/core/testing";
import {BehaviorSubject} from "rxjs";
import {SettingsComponent} from "./settings.component";
import {NavigationService} from "@services/navigation.service";
import {SettingsService} from "@services/settings.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {SettingsResponse, UserSettings} from "@models/settings.model";
import {PHRASES} from "@config/phrases";
import {escapeServiceStub} from "../../../testing/escapeServiceStub";
import {ActiveTheme, ThemeService} from "@services/theme.service";

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let settings$: BehaviorSubject<UserSettings>;
  let theme$: BehaviorSubject<ActiveTheme>;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let themeService: jasmine.SpyObj<ThemeService>;

  beforeEach(() => {
    settings$ = new BehaviorSubject<UserSettings>({showFavoritesOnHome: true, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'purple_haze', themeMode: 'system'});
    theme$ = new BehaviorSubject<ActiveTheme>({theme: 'purple_haze', resolvedMode: 'dark'});
    settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', ['getSettings', 'update'], {settings$});
    settingsService.getSettings.and.callFake(() => settings$.value);
    toastService = jasmine.createSpyObj('ToastService', ['show']);
    themeService = jasmine.createSpyObj<ThemeService>('ThemeService', ['apply', 'preview'], {theme$});
    component = new SettingsComponent({} as NavigationService, settingsService, toastService, escapeServiceStub().service, themeService);
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('starts from the saved settings with no unsaved changes', () => {
    expect(component.settings).toEqual({showFavoritesOnHome: true, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'purple_haze', themeMode: 'system'});
    expect(component.hasUnsavedChanges).toBeFalse();
  });

  it('picks up settings that finish loading while nothing has changed', () => {
    settings$.next({showFavoritesOnHome: false, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'purple_haze', themeMode: 'system'});

    expect(component.settings.showFavoritesOnHome).toBeFalse();
    expect(component.hasUnsavedChanges).toBeFalse();
  });

  it('saves a switch change at once with the saved theme and mode and keeps no unsaved changes', fakeAsync(() => {
    const saved: UserSettings = {showFavoritesOnHome: true, showFavoritesInSidebar: true, showMyWorkOnHome: true, theme: 'purple_haze', themeMode: 'system'};
    settingsService.update.and.returnValue(Promise.resolve({success: true, settings: saved}));

    component.handleSettingChange('showFavoritesInSidebar', true);

    expect(settingsService.update).toHaveBeenCalledOnceWith(saved);
    expect(component.hasUnsavedChanges).toBeFalse();
    tick();

    expect(component.savedSettings).toEqual(saved);
    expect(component.hasUnsavedChanges).toBeFalse();
    expect(toastService.show).not.toHaveBeenCalled();
  }));

  it('sends the saved theme on a switch change and re-previews the pending theme afterwards', fakeAsync(() => {
    settingsService.update.and.returnValue(Promise.resolve({success: true, settings: {showFavoritesOnHome: false, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'purple_haze', themeMode: 'system'}}));
    component.handleThemeChange('coffee');
    themeService.preview.calls.reset();

    component.handleSettingChange('showFavoritesOnHome', false);
    tick();

    expect(settingsService.update).toHaveBeenCalledOnceWith({showFavoritesOnHome: false, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'purple_haze', themeMode: 'system'});
    expect(themeService.preview).toHaveBeenCalledOnceWith('coffee', 'system');
    expect(component.settings.theme).toBe('coffee');
    expect(component.hasUnsavedChanges).toBeTrue();
  }));

  it('restores the switch and shows an error toast when a switch save fails', fakeAsync(() => {
    settingsService.update.and.returnValue(Promise.resolve({success: false, code: 'SETTINGS_UPDATE_FAILED'}));

    component.handleSettingChange('showFavoritesOnHome', false);
    tick();

    expect(component.settings.showFavoritesOnHome).toBeTrue();
    expect(component.isSavingToggles).toBeFalse();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.SETTINGS_SAVE_FAILED});
  }));

  it('sends a switch change made during a save once that save finishes, with both values', fakeAsync(() => {
    let resolveFirst: (response: SettingsResponse) => void = () => {};
    const first: UserSettings = {showFavoritesOnHome: false, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'purple_haze', themeMode: 'system'};
    const second: UserSettings = {...first, showMyWorkOnHome: false};
    settingsService.update.and.returnValues(
      new Promise<SettingsResponse>((resolve) => resolveFirst = resolve),
      Promise.resolve({success: true, settings: second})
    );

    component.handleSettingChange('showFavoritesOnHome', false);
    component.handleSettingChange('showMyWorkOnHome', false);
    settings$.next(first);

    expect(settingsService.update).toHaveBeenCalledTimes(1);
    expect(component.settings.showMyWorkOnHome).toBeFalse();

    resolveFirst({success: true, settings: first});
    tick();

    expect(settingsService.update).toHaveBeenCalledTimes(2);
    expect(settingsService.update.calls.mostRecent().args[0]).toEqual(second);
    expect(component.savedSettings).toEqual(second);
    expect(component.settings.showMyWorkOnHome).toBeFalse();
  }));

  it('allows leaving straight after a switch change', () => {
    settingsService.update.and.returnValue(new Promise<SettingsResponse>(() => {}));

    component.handleSettingChange('showFavoritesOnHome', false);

    expect(component.confirmLeave()).toBeTrue();
  });

  it('does nothing on save without unsaved changes', () => {
    component.handleSave();

    expect(settingsService.update).not.toHaveBeenCalled();
  });

  it('saves the settings and shows a success toast', fakeAsync(() => {
    settingsService.update.and.returnValue(Promise.resolve({success: true, settings: {showFavoritesOnHome: true, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'coffee', themeMode: 'system'}}));
    component.handleThemeChange('coffee');

    component.handleSave();
    expect(component.isSaving).toBeTrue();
    tick();

    expect(settingsService.update).toHaveBeenCalledWith({showFavoritesOnHome: true, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'coffee', themeMode: 'system'});
    expect(component.hasUnsavedChanges).toBeFalse();
    expect(component.isSaving).toBeFalse();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.SUCCESS, message: PHRASES.SETTINGS_SAVED});
  }));

  it('keeps the unsaved values and shows an error toast when saving fails', fakeAsync(() => {
    settingsService.update.and.returnValue(Promise.resolve({success: false, code: 'SETTINGS_UPDATE_FAILED'}));
    component.handleThemeChange('coffee');

    component.handleSave();
    tick();

    expect(component.settings.theme).toBe('coffee');
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.SETTINGS_SAVE_FAILED});
  }));

  it('allows leaving straight away without unsaved changes', () => {
    expect(component.confirmLeave()).toBeTrue();
    expect(component.isLeaveConfirmOpen).toBeFalse();
  });

  it('asks before leaving with unsaved changes and resolves true on Leave', async () => {
    component.handleThemeChange('coffee');

    const result = component.confirmLeave();
    expect(component.isLeaveConfirmOpen).toBeTrue();
    component.handleConfirmLeave();

    expect(await result).toBeTrue();
    expect(component.isLeaveConfirmOpen).toBeFalse();
  });

  it('resolves false on Cancel', async () => {
    component.handleThemeChange('coffee');

    const result = component.confirmLeave();
    component.handleCancelLeave();

    expect(await result).toBeFalse();
  });

  it('marks unsaved changes and previews when the theme changes', () => {
    component.handleThemeChange('coffee');

    expect(component.hasUnsavedChanges).toBeTrue();
    expect(component.settings.theme).toBe('coffee');
    expect(themeService.preview).toHaveBeenCalledOnceWith('coffee', 'system');
  });

  it('previews the current theme in the new mode when the mode changes', () => {
    component.handleThemeChange('paper');

    component.handleModeChange('light');

    expect(component.hasUnsavedChanges).toBeTrue();
    expect(themeService.preview).toHaveBeenCalledWith('paper', 'light');
  });

  it('follows the resolved mode of the active theme', () => {
    theme$.next({theme: 'paper', resolvedMode: 'light'});

    expect(component.resolvedMode).toBe('light');
  });

  it('saves the theme and mode with the other settings', fakeAsync(() => {
    const saved: UserSettings = {showFavoritesOnHome: true, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'graphite', themeMode: 'dark'};
    settingsService.update.and.returnValue(Promise.resolve({success: true, settings: saved}));
    component.handleThemeChange('graphite');
    component.handleModeChange('dark');

    component.handleSave();
    tick();

    expect(settingsService.update).toHaveBeenCalledWith(saved);
    expect(component.hasUnsavedChanges).toBeFalse();
  }));

  it('re-applies the saved theme when destroyed without saving', () => {
    component.handleThemeChange('terminal');
    component.handleModeChange('light');

    component.ngOnDestroy();

    expect(themeService.apply).toHaveBeenCalledWith('purple_haze', 'system');
  });

  it('keeps a saved theme when destroyed after saving', fakeAsync(() => {
    settingsService.update.and.returnValue(Promise.resolve({success: true, settings: {showFavoritesOnHome: true, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'nature', themeMode: 'light'}}));
    component.handleThemeChange('nature');
    component.handleModeChange('light');
    component.handleSave();
    tick();

    component.ngOnDestroy();

    expect(themeService.apply).toHaveBeenCalledWith('nature', 'light');
  }));
});
