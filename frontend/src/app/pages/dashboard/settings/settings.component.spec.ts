import {fakeAsync, tick} from "@angular/core/testing";
import {BehaviorSubject} from "rxjs";
import {SettingsComponent} from "./settings.component";
import {NavigationService} from "@services/navigation.service";
import {SettingsService} from "@services/settings.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {UserSettings} from "@models/settings.model";
import {PHRASES} from "@config/phrases";
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
    component = new SettingsComponent({} as NavigationService, settingsService, toastService, themeService);
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

  it('has unsaved changes as soon as a checkbox differs', () => {
    component.handleSettingChange('showFavoritesInSidebar', true);

    expect(component.hasUnsavedChanges).toBeTrue();
  });

  it('does nothing on save without unsaved changes', () => {
    component.handleSave();

    expect(settingsService.update).not.toHaveBeenCalled();
  });

  it('saves the settings and shows a success toast', fakeAsync(() => {
    settingsService.update.and.returnValue(Promise.resolve({success: true, settings: {showFavoritesOnHome: false, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'purple_haze', themeMode: 'system'}}));
    component.handleSettingChange('showFavoritesOnHome', false);

    component.handleSave();
    expect(component.isSaving).toBeTrue();
    tick();

    expect(settingsService.update).toHaveBeenCalledWith({showFavoritesOnHome: false, showFavoritesInSidebar: false, showMyWorkOnHome: true, theme: 'purple_haze', themeMode: 'system'});
    expect(component.hasUnsavedChanges).toBeFalse();
    expect(component.isSaving).toBeFalse();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.SUCCESS, message: PHRASES.SETTINGS_SAVED});
  }));

  it('keeps the unsaved values and shows an error toast when saving fails', fakeAsync(() => {
    settingsService.update.and.returnValue(Promise.resolve({success: false, code: 'SETTINGS_UPDATE_FAILED'}));
    component.handleSettingChange('showFavoritesOnHome', false);

    component.handleSave();
    tick();

    expect(component.settings.showFavoritesOnHome).toBeFalse();
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.SETTINGS_SAVE_FAILED});
  }));

  it('allows leaving straight away without unsaved changes', () => {
    expect(component.confirmLeave()).toBeTrue();
    expect(component.isLeaveConfirmOpen).toBeFalse();
  });

  it('asks before leaving with unsaved changes and resolves true on Leave', async () => {
    component.handleSettingChange('showFavoritesOnHome', false);

    const result = component.confirmLeave();
    expect(component.isLeaveConfirmOpen).toBeTrue();
    component.handleConfirmLeave();

    expect(await result).toBeTrue();
    expect(component.isLeaveConfirmOpen).toBeFalse();
  });

  it('resolves false on Cancel', async () => {
    component.handleSettingChange('showFavoritesOnHome', false);

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

  it('has unsaved changes after turning My Work on Home off', () => {
    component.handleSettingChange('showMyWorkOnHome', false);

    expect(component.hasUnsavedChanges).toBeTrue();
    expect(component.settings.showMyWorkOnHome).toBeFalse();
  });
});
